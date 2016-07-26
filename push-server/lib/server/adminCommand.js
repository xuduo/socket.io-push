module.exports = AdminCommand;
const logger = require('winston-proxy')('AdminCommand');

function AdminCommand(redis, stats, packetSevice, proxyServer, apiThrehold) {
    if (!(this instanceof AdminCommand)) return new AdminCommand(redis, stats, packetSevice, proxyServer, apiThrehold);

    redis.on("message", function (channel, message) {
        if (channel == "adminCommand") {
            const command = JSON.parse(message);
            logger.debug( 'adminCommand %j', command);
            if (command.command == 'packetDropThreshold') {
                logger.debug( 'setting packetDropThreshold %d', stats.packetDropThreshold);
                stats.packetDropThreshold = command.packetDropThreshold;
            } else if (command.command == 'stopPacketService' && packetSevice) {
                packetSevice.stopped = true;
            } else if (command.command == 'startPacketService' && packetSevice) {
                packetSevice.stopped = false;
            } else if (command.command == 'topicOnline') {
                const online = proxyServer.getTopicOnline(command.topic);
                if (online > 0) {
                    redis.incrby("stats#topicOnline#" + command.topic, online);
                }
            } else if (command.command == 'topicThreshold') {
                apiThrehold.setThreshold(command.topic, command.threshold);
            }
        }
    });
    redis.subscribe("adminCommand");

}