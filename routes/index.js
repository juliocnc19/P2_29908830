const express = require('express');
const router = express.Router();
const sqlite3=require('sqlite3').verbose();
const http=require('http');
const path = require('path');
const geoip = require('geoip-lite');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch'); 
require('dotenv').config({path:'../.env'})

const { I18n } = require('i18n')
const i18n = new I18n({
  locales: ['es', 'en'],
  directory: path.join(__dirname, '/locales'),
  defaultLocale: 'es',
});

const db=path.join(__dirname,"database","basededatos.db");

//conexion con la base de datos 
const db_run = new sqlite3.Database(db, err =>{ 
if (err){
  return console.error(err.message);
}else{
  console.log("Base de datos conectada");
}
})

//creacion de la base de datos 
const crear="CREATE TABLE IF NOT EXISTS contactos(nombre VARCHAR(16),email VARCHAR(16), comentario TEXT,fecha DATATIME, ipdire VARCHAR(15), hora VARCHAR(20), geoloca VARCHAR(3));";

//anexdo de tabla 
db_run.run(crear,err=>{
  if (err){
  return console.error(err.message);
  }else{
  console.log("Tabla anexada");
  }
})

router.get('/contactos',(req,res)=>{
  let sql="SELECT * FROM contactos;";
  db_run.all(sql, [],(err, rows)=>{
      if (err){
        return console.error(err.message);
      }else{
      res.render("contactos.ejs",{modelo:rows});
      }
  })
})

//uso de la api de geolocalizacion 
// router.get('/',(req, res)=>{
//   var ip = req.ip
//   var geo = geoip.lookup(ip);
//   console.log(geo);
// });

//ip y la feha, junto con la importacion de los datos a la base 
router.post('/',(req,res)=>{
    const responseKey = req.body["g-recaptcha-response"];
    const secretKey = "6LfRjYcgAAAAALL8ssrUU4Dgm4BwbprYXqOu5lhf";
    const url = 
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${responseKey}`;
    fetch(url, {
      method: "post",
    })
      .then((response) => response.json())
      .then((google_response) => {
          if (google_response.success == true) {
          let today = new Date();
          let hours = today.getHours();
          let minutes = today.getMinutes();
          let seconds = today.getSeconds();
          let fecha = today.getDate() + '-' + ( today.getMonth() + 1 ) + '-' + today.getFullYear();
          let hora = hours + ':' + minutes + ':' + seconds + ' ';
          let ipdire = req.header('x-forwarded-for') || req.connection.remoteAddress;
          let ip = req.ip;
          let geo = geoip.lookup(ip);

          let geoloca = geo.country;
          let email = req.body.email;
          let nombre = req.body.nombre;
          let comentario = req.body.comentario;

          let sql="INSERT INTO contacts(nombre, email, comentario, fecha, ipdire, hora, geoloca) VALUES (?,?,?,?,?,?,?)";
          let nuevos_mensajes=[nombre,email,comentario,fecha,ip,hora,geoloca];

          db_run.run(sql, nuevos_mensajes, err =>{
            if (err){
              return console.error(err.message);
            }else{
                setTimeout(function(){
                   res.redirect("/"); 
                }, 1800);
            }
            })
             const transporter = nodemailer.createTransport({
              host: "smtp-mail.outlook.com",
              secureConnection: false,
              port: 587, 
              auth: {
                user: "juliocnc19@outlook.com",
                pass: "jc19012003"
            }
            });
          const contenidoHTML = `
            <p>Programacion P2</p>
            <h3>Información del Cliente/Contacto:</h3>
            <ul>
              <li>Nombre: ${nombre}</li>
              <li>Email: ${email}</li>
              <li>Comentario: ${comentario}</li>
              <li>Fecha: ${fecha}</li>
            <li>Hora: ${hora}
            <li>IP: ${ipdire}</li>
            <li>Pais: ${geoloca}</li>
            </ul>`;

          const send = {
            from: process.env.EMAIL,
            to: 'programacion2ais@dispostable.com',
            subject: 'Informacion del Contacto', 
            html: contenidoHTML
          };

          transporter.sendMail(send,(err, info) => {
            if(err)
              console.log(err)
            else
              console.log(info);
            })
          
          }else{
  
                setTimeout(function(){
              res.redirect("/");        
              }, 1800);
              }
              }).catch((error) => {
                return res.json({ error });
            });
           
});

let translate = false;

router.get('/',(req,res) => {
  i18n.init(req, res);
  translate = req.acceptsLanguages('es');
  res.render('index.ejs',{modelo:{}})
});

router.get('/translate',(req,res,next)=>{
	if(translate){
	  i18n.init(req, res)
	  translate = false;
	  res.setLocale('en');
	  res.render('index.ejs',{modelo:{}});
  }else if(!translate){
    i18n.init(req, res);
	  res.setLocale('es');
	  translate = true;
	  res.render('index',{modelo:{}});
  }
});

module.exports = router;
