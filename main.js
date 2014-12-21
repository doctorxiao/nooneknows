var express = require('express');
var oauth=require('./oauth.js');
var userpanel=require('./userpanel.js');
var voice=require('./voice.js');
var picbed=require('./picbed.js');
var image=require('./image.js');
var group=require('./group.js');
var session = require('express-session')
var config=require("./config.js").config;
var cql = require('node-cassandra-cql');
var client = new cql.Client(config.cassandra);
var path=require('path');
var serveStatic = require('serve-static')
var app = express();

var options = {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['htm', 'html'],
  index: false,
  maxAge: '1d',
  redirect: false,
  setHeaders: function (res, path, stat) {
    res.set('x-timestamp', Date.now())
  }
};

app.use('/public',serveStatic('/var/sitexiao/public', {'index': ['default.html', 'default.htm']}))
app.use(session({secret: 'this is it sounds cool', resave:true, saveUninitialized :true }));
var server = app.listen(80, function() {
    console.log('Listening on port %d', server.address().port);
});



app.use("/loginback",oauth.back);
app.use("/userpanel",userpanel.router);
app.use("/voice",voice.router);
app.use("/picbed",picbed.router);
app.use("/image",image.router);
app.use("/group",group.router);

app.get('/login', function(req, res){
	var str='<a href="https://graph.renren.com/oauth/authorize?client_id=0d84eb06e9304cd6ad5d56bbc5a4c76e&redirect_uri=http://www.itsounds.cool/loginback/renrenlogin&response_type=code">从人人登录</a>';
	//str+='<br><a href="https://api.weibo.com/oauth2/authorize?client_id=864293699&response_type=code&redirect_uri=http://www.itsounds.cool/loginback/weibologin">从微博登录</a>';
	res.send(str);
});

app.get('/bind', function(req, res){
	if (session.uuid==undefined || session.uuid=="")
	{
		res.send("您还木有登录，请去<a href=\"http://www.itsounds.cool/login\">登录</a>")
		return ;
	}
	var str='<a href="https://graph.renren.com/oauth/authorize?client_id=0d84eb06e9304cd6ad5d56bbc5a4c76e&redirect_uri=http://www.itsounds.cool/loginback/renrenbind&response_type=code">绑定人人</a>';
	str+='<br><a href="https://api.weibo.com/oauth2/authorize?client_id=864293699&response_type=code&redirect_uri=http://www.itsounds.cool/loginback/weibobind">绑定微博</a>';
	res.send(str);
});

app.get('/cassandra',function(req, res){
	client.execute("select * from system.schema_columns where keyspace_name='site';",[],function(err,result){
		if (err)
		{
			res.send(err)
			return 
		}
		var str=""
		for(var i=0;i<result.rows.length;i++)
		{
			str+="table:"+result.rows[i].columnfamily_name+"<br />column:"+result.rows[i].column_name+"<br />type:"+result.rows[i].validator+"<br />index:"+result.rows[i].index_name+"<br /><br /><br />"
		}
		res.send(str)
	})
})


app.get('/',function(req,res){
	res.send('under construction<p><a href="http://www.itsounds.cool/login">登录功能</a></p><p><a href="http://www.itsounds.cool/picbed/upload">图床功能</a></p><p><a href="http://www.itsounds.cool/cassandra">数据表结构</a></p>');
})