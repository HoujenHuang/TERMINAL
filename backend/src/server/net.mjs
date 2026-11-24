import { SocksClient } from "socks";
import * as logging from "../logging.mjs";
import { AsyncQueue } from "../websocket.mjs";
import { options } from "./options.mjs";
import { net, dgram, dns } from "../compat.mjs";

export const is_node = (typeof process !== "undefined");

const PROFILE_MAP = {
  "direct": 10800,
  "blackhole": 10801,
  "http": 10802,
  "warp": 10808,
  "socks": 10808,
  "tor": 9050,
  "shadowsocks": 10815,
  "hysteria": 10816,
  "vless-vision-tcp": 10810,
  "vless-reality-tcp": 10811,
  "vless-reality-xhttp": 10812,
  "vless-enc-tcp": 10810,
  "vmess-tls-ws": 10813,
  "trojan-tls-tcp": 10814,
  "vless-tls-mkcp": 10817
};

const dns_cache = new Map();
let dns_servers = null;
let resolver = null;

export function assert_on_node() {
  if (!is_node) throw new Error("ERROR: Not running on Node.js");
}

function resolve4(hostname) { return resolver.resolve4(hostname); }
function resolve6(hostname) { return resolver.resolve6(hostname); }

async function resolve_with_fallback(resolve_first, resolve_after, hostname) {
  try {
    return (await resolve_first(hostname))[0];
  } catch {
    return (await resolve_after(hostname))[0];
  }
}

async function perform_lookup(hostname) {
  if (options.dns_method === "lookup") {
    let result = await dns.lookup(hostname, { order: options.dns_result_order });
    return result.address;
  }
  else if (options.dns_method === "resolve") {
    if (!resolver) resolver = new dns.Resolver();

    if (options.dns_servers !== dns_servers) {
      logging.debug("Setting custom DNS servers to: " + options.dns_servers.join(", "));
      resolver.setServers(options.dns_servers);
      dns_servers = options.dns_servers;
    }

    if (options.dns_result_order === "verbatim" || options.dns_result_order === "ipv6first")
      return await resolve_with_fallback(resolve6, resolve4, hostname);
    else if (options.dns_result_order === "ipv4first")
      return await resolve_with_fallback(resolve4, resolve6, hostname);
    else
      throw new Error("ERROR: Invalid result order.");
  }
  else if (typeof options.dns_method === "function") {
    return await options.dns_method(hostname);
  }

  throw new Error("ERROR: Invalid DNS method.");
}

export async function lookup_ip(hostname) {
  if (!is_node) return hostname;

  let ip_level = net.isIP(hostname);
  if (ip_level === 4 || ip_level === 6) return hostname;

  let now = Date.now();
  for (let [entry_hostname, cache_entry] of dns_cache) {
    let ttl = now - cache_entry.time;
    if (ttl > options.dns_ttl) dns_cache.delete(entry_hostname);
  }

  let cache_entry = dns_cache.get(hostname);
  if (cache_entry) {
    if (cache_entry.error) throw cache_entry.error;
    return cache_entry.address;
  }

  let address;
  try {
    address = await perform_lookup(hostname);
    logging.debug(`Domain resolved: ${hostname} -> ${address}`);
    dns_cache.set(hostname, { time: Date.now(), address: address });
  } catch (e) {
    dns_cache.set(hostname, { time: Date.now(), error: e });
    throw e;
  }

  return address;
}

function attachSocketListeners(instance, tag) {
  instance.socket.setNoDelay(true);
  instance.connected = true;

  instance.socket.on("data", (data) => {
    instance.data_queue.put(data);
  });
  instance.socket.on("close", (error) => {
    if (error && !instance.connected) {
      // closed before connected
    } else {
      instance.data_queue.close();
    }
    instance.socket = null;
  });
  instance.socket.on("error", (error) => {
    logging.warn(`[${tag}] TCP stream to ${instance.hostname} ended with error: ${error.message || error}`);
  });
  instance.socket.on("end", () => {
    if (!instance.socket) return;
    instance.socket.destroy();
    instance.socket = null;
  });
}

export class NodeTCPSocket {
  constructor(hostname, port, route_param = "warp") {
    assert_on_node();
    this.hostname = hostname;
    this.port = Number(port);

    if (typeof route_param === "boolean") {
      this.profile = route_param ? "tor" : "warp";
    } else {
      this.profile = route_param || "warp";
    }

    this.recv_buffer_size = 128;
    this.socket = null;
    this.paused = false;
    this.connected = false;
    this.data_queue = new AsyncQueue(this.recv_buffer_size);
  }

  async connect() {
    console.log(`[Socket Connect] ${this.hostname}:${this.port} | Profile: ${this.profile}`);

    if (this.profile === "blackhole") {
      logging.debug(`[Blackhole] Dropping connection to ${this.hostname}:${this.port}`);
      this.connected = true;
      this.data_queue.close();
      return;
    }

    let targetPort = PROFILE_MAP[this.profile];

    if (!targetPort) {
      if (this.profile.startsWith("vless-reality")) targetPort = 10811;
      else if (this.profile.startsWith("vless-vision")) targetPort = 10810;
      else if (this.profile.startsWith("vmess")) targetPort = 10813;
      else if (this.profile.startsWith("trojan")) targetPort = 10814;
      else targetPort = 10808;
    }

    try {
      const info = await SocksClient.createConnection({
        proxy: {
          ipaddress: "127.0.0.1",
          port: targetPort,
          type: 5
        },
        command: "connect",
        destination: {
          host: this.hostname,
          port: this.port
        }
      });

      this.socket = info.socket;
      attachSocketListeners(this, this.profile);
      return;
    } catch (err) {
      logging.warn(`[${this.profile}] SOCKS connection failed to port ${targetPort} for ${this.hostname}:${this.port} - ${err.message}`);

      if (this.profile === "direct") {
        logging.warn(`[Direct] Falling back to native TCP for ${this.hostname}`);
        let ip = await lookup_ip(this.hostname);
        await new Promise((resolve, reject) => {
          this.socket = new net.Socket();
          this.socket.setNoDelay(true);
          this.socket.on("connect", () => {
            this.connected = true;
            resolve();
          });
          this.socket.on("data", (data) => this.data_queue.put(data));
          this.socket.on("close", (error) => {
            if (error && !this.connected) reject(error);
            else this.data_queue.close();
            this.socket = null;
          });
          this.socket.on("error", (error) => {
            logging.warn(`[Direct-Native] TCP error: ${error.message || error}`);
          });
          this.socket.on("end", () => {
            if (!this.socket) return;
            this.socket.destroy();
            this.socket = null;
          });
          this.socket.connect({ host: ip, port: this.port });
        });
        return;
      }
      throw err;
    }
  }

  async recv() { return await this.data_queue.get(); }
  async send(data) {
    if (!this.socket) return;
    await new Promise((resolve) => this.socket.write(data, resolve));
  }
  async close() {
    if (!this.socket) return;
    this.socket.end();
    this.socket = null;
  }
  pause() {
    if (this.socket && this.data_queue.size >= this.data_queue.max_size) {
      this.socket.pause();
      this.paused = true;
    }
  }
  resume() {
    if (!this.socket) return;
    if (this.paused) {
      this.socket.resume();
      this.paused = false;
    }
  }
}

export class NodeUDPSocket {
  constructor(hostname, port, route_param = "warp") {
    assert_on_node();
    this.hostname = hostname;
    this.port = Number(port);

    if (typeof route_param === "boolean") {
      this.profile = route_param ? "tor" : "warp";
    } else {
      this.profile = route_param || "warp";
    }

    this.connected = false;
    this.recv_buffer_size = 128;
    this.data_queue = new AsyncQueue(this.recv_buffer_size);
  }

  async connect() {
    if (this.profile === "tor") throw new Error("ERROR: Tor does not support raw UDP streams");

    let ip = await lookup_ip(this.hostname);
    let ip_level = net.isIP(ip);
    await new Promise((resolve, reject) => {
      this.socket = dgram.createSocket(ip_level === 6 ? "udp6" : "udp4");
      this.socket.on("connect", () => {
        this.connected = true;
        resolve();
      });
      this.socket.on("message", (data) => this.data_queue.put(data));
      this.socket.on("error", (err) => {
        if (!this.connected) reject(err);
        this.data_queue.close();
        this.socket = null;
      });
      this.socket.connect(this.port, ip);
    });
  }

  async recv() { return await this.data_queue.get(); }
  async send(data) {
    if (!this.socket) return;
    this.socket.send(data);
  }
  async close() {
    if (!this.socket) return;
    this.socket.close();
    this.socket = null;
  }
  pause() {}
  resume() {}
}
