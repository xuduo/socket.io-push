webpack --optimize-minimize --output.filename push-client-1.0.min.js
webpack --output.filename push-client-1.0.js
npm publish ./ && cnpm sync socket.io-push