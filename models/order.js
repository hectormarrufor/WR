const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const Client = require('./user');
const Stone = require('./vehiculoPesado');

const Order = sequelize.define('Order', {
    
    address: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    cost: {
        type: DataTypes.STRING,
        allowNull: false,
      },
     
      thickness: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      }
      

});

//Relaciones: Pedido pertenece a cliente
Order.belongsTo(Client, {
    foreignKey: 'id'
});

//Pedido pertenecia a Producto
Order.belongsTo(Stone, {
    foreignKey: "id"
})

module.exports= Order;