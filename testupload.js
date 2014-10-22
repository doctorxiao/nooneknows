
var up=require("./upload.js")

var upload={}
upload.buffer=new Buffer("asdaasdaads")
upload.contentType="image/jpg"
upload.fileSuffix="jpg"
upload.is_Pic=true

up.uploadBuffer(upload,function(err,result){
	console.log(result)
})