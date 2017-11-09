var matching = function(user) {
  chrome.tabs.executeScript({
    code: 'document.querySelector("body").innerText'
  }, function (result) {
    if (result && result[0]) {
      // 위의 코드가 실행된 후에 이 함수를 호출해주세요. 그 때 result에 담아주세요.
      $.post('http://localhost:3000/matching', {
        user: user,
        result: result
      }, function(res) {
        if (res && res.result) {
          $('#result').text(res.text);
        } else {
          $('#result').text('0/0 (0%)');
        }
      });
    } else {
      $('#result').text('0/0 (0%)');
    }
  });
};

var print_emotion = function(text) {
    chrome.tabs.executeScript({
        code: 'document.querySelector(".text_exposed_root:first-child").innerText'
    }, function(result) {
        if (result && result[0]) {
            $.get('http://localhost:3000/external_api', {
                url: 'http://home.iacryl.com:7070/', 
                options: {
                    nlptype: 'aer',
                    text: encodeURIComponent(result[0])
                }
            }, function(res) {
                console.log(res);
                if (res.sentences) {
                    var sentences = res.sentences[0];
                    var emotions = sentences.emotions;
                    var main_emotion = emotions[0].emotion;
                    var sentence = sentences.sentence;

                    $('#result').text('The emotion of "' + sentence + '" is "' + main_emotion + '".');
                } else {
                    $('#result').text('Cannot find any text or emotion.');
                }
            });
        } else {
            $('#result').text('No Text!!');
        }
    });
};

//크롬 스토리지에 저장된 값을 가져오세요. 
chrome.storage.sync.get(function (data) {
  // #user의 값으로 data의 값을 입력해주세요. 
  $('#user').val(data.userWords || '');

  //분석해서 그 결과를 #result에 넣어주세요. 
  //matching(data.userWords);

    if (data.check) {
        print_emotion();
    }
});

//컨텐츠 페이지의 #user 입력된 값이 변경 되었을 '때'
$(document).on('change', '#user', function () {
  //컨텐츠 페이지에 몇개의 단어가 등장하는지 계산해주세요. 
  var user = $(this).val();

  // 크롬 스토리지에 입력값을 저장한다. 
  chrome.storage.sync.set({
    userWords: user
  });

  //컨텐츠 페이지를 대상으로 코드를 실행해주세요. 
  matching(user);

});

$(document).on('click', '#emotion_check', function() {
    chrome.storage.sync.set({
        check: true
    });

    print_emotion();
});
