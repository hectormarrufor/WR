import jwt from 'jsonwebtoken';

function authorize(tiposPermitidos) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ mensaje: 'Token no proporcionado' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = decoded;

      if (!tiposPermitidos.includes(decoded.tipo)) {
        return res.status(403).json({ mensaje: 'Acceso denegado' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ mensaje: 'Token inválido' });
    }
  };
}

export default authorize;