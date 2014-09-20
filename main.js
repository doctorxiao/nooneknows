var express = require('express');
var oauth=require('./oauth.js');
var userpanel=require('./userpanel.js');
var session = require('express-session')


var app = express();
app.use(session({secret: 'this is it sounds cool'}));

var server = app.listen(80, function() {
    console.log('Listening on port %d', server.address().port);
});



app.use("/loginback",oauth.back);
app.use("/userpanel",userpanel.router);

app.get('/login', function(req, res){
	var str='<a href="https://graph.renren.com/oauth/authorize?client_id=0d84eb06e9304cd6ad5d56bbc5a4c76e&redirect_uri=http://www.itsounds.cool/loginback/renrenlogin&response_type=code">从人人登录</a>';
	str+='<br><a href="https://api.weibo.com/oauth2/authorize?client_id=864293699&response_type=code&redirect_uri=http://www.itsounds.cool/loginback/weibologin">从微博登录</a>';
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

app.get('/',function(req,res){
	res.send('under construction<p><a href="http://www.itsounds.cool/login">登录功能</a></p>');
})