const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api/proxy',
    createProxyMiddleware({
      target: 'https://example.com',
      changeOrigin: true,
      router: (req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) {
          throw new Error('Target URL is missing');
        }
        return new URL(targetUrl).origin;
      },
      pathRewrite: (path, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) {
          return path;
        }
        return new URL(targetUrl).pathname + new URL(targetUrl).search;
      },
      onProxyReq: (proxyReq, req, res) => {
        proxyReq.removeHeader('x-forwarded-host');
        proxyReq.removeHeader('x-forwarded-proto');
        proxyReq.removeHeader('x-forwarded-for');
      },
      onError: (err, req, res) => {
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ message: 'Proxy error: ' + err.message }));
      },
    })
  );
};