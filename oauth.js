var express = require('express');
var http=require('http');
var https=require('https');
//var cassandra=require('node-cassandra-cql');
var uuid=require('node-uuid');

var app = express();
//var client = new cassandra.Client({hosts: ['108.61.218.220:9160', '108.61.218.214:9160'], username:"xx",password:"xx123456&*(",keyspace: 'site'});
var Connection = require('cassandra-client').Connection;
var con = new Connection({host:'108.61.218.220', port:9160, keyspace:'site', user:'xx', pass:'xx123456&*('});

app.get('/login', function(req, res){
  res.send('<a href="https://graph.renren.com/oauth/authorize?client_id=0d84eb06e9304cd6ad5d56bbc5a4c76e&redirect_uri=http://108.61.216.126/renrenlogin&response_type=code">从人人登录</a>');
});

app.get('/renrenlogin', function(req, res){
    if (req.query.code!=undefined)
	{
	    console.log(req.query.code)
	    var callurl="https://graph.renren.com/oauth/token?grant_type=authorization_code&client_id=0d84eb06e9304cd6ad5d56bbc5a4c76e&redirect_uri=http://108.61.216.126/renrenlogin&client_secret=dca3ec7d0aa241b9894dd376df21e716&code="+req.query.code;
		var options={}
		options.host="graph.renren.com";
		options.method="POST";
		options.path="/oauth/token?grant_type=authorization_code&client_id=0d84eb06e9304cd6ad5d56bbc5a4c76e&redirect_uri=http://108.61.216.126/renrenlogin&client_secret=dca3ec7d0aa241b9894dd376df21e716&code="+req.query.code;
		options.headers={"Content-Length":0}
		var post_req=https.request(options,function(post_res){
		    post_res.on("data",function(a){
			    a=eval("("+a+")")
				querya={query: 'INSERT INTO users (userid,source,sourceid,username,photo,createtime,email,access_token) values (?,?,?,?,?,?,?,?)',
				       params: [uuid.v1(),"renren",a.user.id,a.user.name,a.user.avatar[1].url,Date.parse(new Date()),"",a.access_token]
					  }
				console.log(querya)
				con.connect(function(err){
				    if (err)
					{
					    res.send(err)
					} else
					{
					    con.execute(querya.query,querya.params,function(error){
				            if (error)
					        {
					            res.send(error)
					        } else
					        {
					            res.send("OK")
					        }
				        })
					}
				})
			})
		})
		post_req.end();
	}
});

var server = app.listen(80, function() {
    console.log('Listening on port %d', server.address().port);
});