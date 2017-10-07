exports.matching = function(req, res) {
	var user = req.body.user;
	var result = req.body.result;
	if (result && result[0]) {
      //이 문서에서 body  태그 아래에 있는 모든 텍스를 가져온다. 그 결과를 bodyText라는 변수에 담는다.
      var bodyText = result[0];
      //bodyText의 모든 단어를 추출하고, 그 단어의 숫자를 센다. 그 결과를 bodyNum이라는 변수에 담는다. 
      var bodyNum = bodyText.split(' ').length;
      //bodyText에서 자신이 알고 있는 단어(the)가 몇번 등장하는지를 알아본다. 그 결과를 myNum이라는 변수에 담는다.
      var match_text = user ? (bodyText.match(new RegExp('\\b(' + user + ')\\b', 'gi')) || []) : [];
      var myNum = match_text.length;
      var per = myNum / bodyNum * 100;
      per = per.toFixed(1);
      // id값이 result인 태그에 결과를 추가한다.
      res.send({
      	result: true,
      	text: myNum + '/' + bodyNum + ' (' + (per) + '%)'
      });
    } else {
      res.send({
      	result: false
      });
    }
};
