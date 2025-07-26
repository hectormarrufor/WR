const { DataTypes } = require('sequelize');
const CategoriaActivo = require('./CategoriaActivo.js');
const sequelize = require('../../sequelize.js');
const Grupo = require('./Grupo.js');



const CategoriaGrupo = sequelize.define('CategoriaGrupo', {}, { timestamps: false });

CategoriaActivo.belongsToMany(Grupo, { through: CategoriaGrupo, as: 'grupos' });
Grupo.belongsToMany(CategoriaActivo, { through: CategoriaGrupo, as: 'categorias' });

// Exportamos todo para que las relaciones se establezcan correctamente
module.exports = { CategoriaActivo, Grupo, CategoriaGrupo };