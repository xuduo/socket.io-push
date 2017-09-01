/**
 * Module dependencies.
 */

var parser = require('socket.io-parser');
var hasBin = require('has-binary');
var debug = require('debug')('socket.io-emitter');

/**
 * Module exports.
 */

module.exports = Emitter;

/**
 * Flags.
 *
 * @api public
 */

var flags = [
  'json',
  'volatile',
  'broadcast'
];

/**
 * uid for emitter
 *
 * @api private
 */

var uid = 'emitter';

/**
 * Socket.IO redis based emitter.
 *
 * @param {Object} redis client (optional)
 * @param {Object} options
 * @api public
 */

function Emitter(redis, opts) {
  if (!(this instanceof Emitter)) return new Emitter(redis, opts);
  opts = opts || {};

  this.redis = redis;
  this.prefix = (opts.key || 'io');

  this._rooms = [];
  this._flags = {};
}

/**
 * Apply flags from `Socket`.
 */

flags.forEach(function(flag) {
  Emitter.prototype.__defineGetter__(flag, function() {
    debug('flag %s on', flag);
    this._flags[flag] = true;
    return this;
  });
});

/**
 * Limit emission to a certain `room`.
 *
 * @param {String} room
 */

Emitter.prototype.in =
  Emitter.prototype.to = function(room) {
    if (!~this._rooms.indexOf(room)) {
      debug('room %s', room);
      this._rooms.push(room);
    }
    return this;
  };

/**
 * Limit emission to certain `namespace`.
 *
 * @param {String} namespace
 */

Emitter.prototype.of = function(nsp) {
  debug('nsp set to %s', nsp);
  this._flags.nsp = nsp;
  return this;
};

/**
 * Send the packet.
 *
 * @api public
 */

Emitter.prototype.emit = function() {
  // packet
  var args = Array.prototype.slice.call(arguments);

  var msg = JSON.stringify(args);
  // publish
  if (this._rooms && this._rooms.length) {
    this._rooms.forEach((room) => {
      const chnRoom = this.prefix + "#" + room;
      this.redis.publish(chnRoom, msg);
    });
  } else {
    this.redis.publish(this.prefix, msg);
  }

  // reset state
  this._rooms = [];
  this._flags = {};

  return this;
};
