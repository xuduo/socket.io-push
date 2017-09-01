/**
 * Module dependencies.
 */

const uid2 = require('uid2');
const Adapter = require('socket.io-adapter');
const logger = require('winston-proxy')('RedisAdapter');

const async = require('async');

/**
 * Module exports.
 */

module.exports = adapter;

/**
 * Returns a redis Adapter class.
 *
 * @param {String} optional, redis uri
 * @return {RedisAdapter} adapter
 * @api public
 */

function adapter(uri, opts, stats) {
  opts = opts || {};

  // handle options only
  if ('object' == typeof uri) {
    opts = uri;
    uri = null;
  }

  // handle uri string
  if (uri) {
    uri = uri.split(':');
    opts.host = uri[0];
    opts.port = uri[1];
  }

  let pub = opts.pubClient;
  let sub = opts.subClient;
  const prefix = opts.key || 'io';

  // this server's key
  const uid = uid2(6);

  /**
   * Adapter constructor.
   *
   * @param {String} namespace name
   * @api public
   */

  function Redis(nsp) {

    Adapter.call(this, nsp);

    this.uid = uid;
    this.pubClient = pub;
    this.subClient = sub;

    const self = this;
    sub.subscribe(prefix, function(err) {
      if (err) self.emit('error', err);
    });
    sub.on('message', this.onmessage.bind(this));
  }

  /**
   * Inherits from `Adapter`.
   */

  Redis.prototype.__proto__ = Adapter.prototype;

  /**
   * Called with a subscription message
   *
   * @api private
   */

  Redis.prototype.onmessage = function(channel, msg) {

    if (stats && stats.shouldDrop()) {
      return;
    }

    let channelStr = channel.toString();
    if (!channelStr.startsWith(prefix + '#')) {
      return;
    }

    channelStr = channelStr.substring((prefix + '#').length, channelStr.length);

    const args = JSON.parse(msg);
    let packet = {
      data: args,
      nsp: '/',
      type: 2
    };

    Adapter.prototype.broadcast.call(this, packet, {
      rooms: [channelStr],
      flags: {
        broadcast: true
      }
    });

  };

  /**
   * Broadcasts a packet.
   *
   * @param {Object} packet to emit
   * @param {Object} options
   * @param {Boolean} whether the packet came from another node
   * @api public
   */

  Redis.prototype.broadcast = function(packet, opts, remote) {

    var msg = JSON.stringify(packet.data);

    if (opts.rooms) {
      opts.rooms.forEach(function(room) {
        const chnRoom = prefix + "#" + room;
        pub.publish(chnRoom, msg);
      });
    } else {
      pub.publish(prefix, msg);
    }
  };

  /**
   * Subscribe client to room messages.
   *
   * @param {String} client id
   * @param {String} room
   * @param {Function} callback (optional)
   * @api public
   */

  Redis.prototype.add = function(id, room, fn) {
    const self = this;
    const needRedisSub = this.rooms.hasOwnProperty(room) && this.rooms[room]
    Adapter.prototype.add.call(this, id, room);
    const channel = prefix + '#' + room;
    if (id == room) {
      if (fn) fn(null);
      return;
    }
    if (needRedisSub) {
      logger.debug("skip re-subscribe to room %s", room);
      if (fn) fn(null);
      return;
    }
    sub.subscribe(channel, function(err) {
      if (err) {
        logger.error('subscribe error %s', channel);
        self.emit('error', err);
        if (fn) fn(err);
        return;
      }
      if (fn) fn(null);
    });
  };

  /**
   * Unsubscribe client from room messages.
   *
   * @param {String} session id
   * @param {String} room id
   * @param {Function} callback (optional)
   * @api public
   */

  Redis.prototype.del = function(id, room, fn) {
    const self = this;
    const hasRoom = this.rooms.hasOwnProperty(room);
    Adapter.prototype.del.call(this, id, room);

    if (id != room && hasRoom && !this.rooms[room]) {
      const channel = prefix + '#' + room;
      logger.debug("unsubscribe ", channel);
      sub.unsubscribe(channel, function(err) {
        if (err) {
          self.emit('error', err);
          if (fn) fn(err);
          return;
        }
        if (fn) fn(null);
      });
    } else {
      if (fn) process.nextTick(fn.bind(null, null));
    }
  };

  /**
   * Unsubscribe client completely.
   *
   * @param {String} client id
   * @param {Function} callback (optional)
   * @api public
   */

  Redis.prototype.delAll = function(id, fn) {
    const self = this;
    const rooms = this.sids[id];

    if (!rooms) {
      if (fn) process.nextTick(fn.bind(null, null));
      return;
    }

    async.forEach(Object.keys(rooms), function(room, next) {
      self.del(id, room, next);
    }, function(err) {
      if (err) {
        self.emit('error', err);
        if (fn) fn(err);
        return;
      }
      delete self.sids[id];
      if (fn) fn(null);
    });
  };

  Redis.prototype.doSocketInRoom = function(nsp, roomName, callback) {
    let room = this.rooms[roomName];
    if (room && room.length > 0) {
      for (let socketId in room.sockets) {
        let socket = nsp.connected[socketId];
        if (socket) {
          callback(socket);
        }
      }
    }
  }

  Redis.uid = uid;
  Redis.pubClient = pub;
  Redis.subClient = sub;
  Redis.prefix = prefix;

  return Redis;

}
