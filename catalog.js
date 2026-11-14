// Catálogo validado no servidor. Actualiza aqui sempre que alterares produtos/preços no menu.
const PRODUCTS = {
  b1:{name:'Beef Burrito',price:500}, b2:{name:'Mexican Burrito',price:500},
  b3:{name:'Steak Burrito',price:540}, b4:{name:'Chicken Burrito',price:500},
  b5:{name:'Korean Twister',price:490}, b6:{name:'Buffalo Twister',price:490},
  h1:{name:'Cheese Burger',price:490}, h2:{name:'Mexican Burger',price:490},
  h3:{name:'Steak Burger',price:540}, h4:{name:'American Burger',price:490},
  h5:{name:'Hawaiian Burger',price:490}, h6:{name:'Alitas Burger',price:490},
  h7:{name:'Chicken Sandwich',price:490}, h8:{name:'Healthy Burger',price:490},
  f1:{name:'Buffalo Loaded Fries',price:580}, f2:{name:'Korean Nachos',price:580},
  f3:{name:'Korean Loaded Fries',price:580}, f4:{name:'Burger Fries',price:580}
};
const STORES = {ronil:'Loja Ronil',delivery:'Delivery Maputo',matola:'Loja Matola',jardim:'Loja Jardim'};
const ZONES = {maputo:{name:'Maputo cidade',store:'delivery'},matola:{name:'Matola',store:'matola'},jardim:{name:'Jardim',store:'jardim'}};
module.exports = { PRODUCTS, STORES, ZONES };
