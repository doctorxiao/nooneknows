var express = require('express');
var uuid=require('node-uuid');
var session = require('express-session')
var config=require("./config.js").config;
var cql = require('node-cassandra-cql');
var ejs=require("ejs")
var client = new cql.Client(config.cassandra);
var router=express.Router();
var app = express();
app.set('views', __dirname + '/views');
app.engine('html', ejs.__express);
app.set('view engine','html');
router.get("/record",function(req,res){
	app.render("record",{},function(err,html){
		if (err)
		{
			console.log(err)
			return
		}
		res.send(html)
	})
})

exports.router=router;

