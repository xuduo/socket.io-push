var UrlCheck = {};

UrlCheck.checkPathname = (req, res) => {
    let url = require('url');
    let pathname = url.parse(req.url).pathname;
    if (pathname == '/' || pathname == '/favicon.ico') {
        res.writeHead(403);
        res.end('403\n');
    } else {
        res.writeHead(200);
        res.end('200\n');
    }
};

module.exports = UrlCheck;


