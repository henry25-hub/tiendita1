module.exports = (allowedIps) => {
  return (req, res, next) => {
    if (!allowedIps || allowedIps.length === 0) return next();

    let clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    if (clientIp.startsWith("::ffff:")) clientIp = clientIp.replace("::ffff:", "");

    if (!allowedIps.includes(clientIp)) {
      console.log(`⚠️ Acceso denegado desde IP: ${clientIp}`);

      if (req.headers.accept?.includes('application/json')) {
        return res.status(403).json({
          status: "error",
          mensaje: "Acceso denegado: tu IP no tiene permiso."
        });
      }

      return res.status(403).render('error', {
        title: "Acceso Denegado",
        mensaje: `Acceso denegado: tu IP (${clientIp}) no tiene permiso para entrar.`,
        error: null
      });
    }

    next();
  };
};
