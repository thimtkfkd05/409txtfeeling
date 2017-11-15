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

var get_text_fb = function(callback) {
    chrome.tabs.executeScript({
        code: 'document.querySelectorAll(".text_exposed_root")'
    }, function(result) {
        if (result && result.length) {
            callback('.text_exposed_root', result);
        } else {
            callback(null);
        }
    });
};

var get_text_dc = function(callback) {
    chrome.tabs.executeScript({
        code: 'document.querySelector("#gallery_re_contents").innerHTML'//'document.querySelectorAll("td.reply")'
    }, function(result) {
        if (result && result.length) {
            console.log(result);
            $('#copy_reply').html(result[0]);
            $('#copy_reply td.reply span').remove();
            
            console.log("DEBUG: ", $('#copy_reply').find('td.reply'));
            if ($('#copy_reply td.reply p').length) {
                /*
                chrome.tabs.executeScript({
                    code: 'document.querySelectorAll("#gallery_re_contents tbody td.reply p").forEach(function(el) {el.remove();});'
                }, function() {
                    callback('#gallery_re_contents tbody > tr:nth-child([IDX]) td.reply', document.querySelectorAll('#copy_reply td.reply'), [4, 1]);
                });
                */
                callback(null, 'already_check');
            } else {
                callback('#gallery_re_contents tbody > tr:nth-child([IDX]) td.reply', document.querySelectorAll('#copy_reply td.reply'), [4, 1]);
            }
        } else {
            callback(null);
        }
    });
};

var filtering_list = /싫음|분노|짜증남/;

var print_emotion = function() {
    //var get_text = get_text_fb;
    var get_text = get_text_dc;
    get_text(function(className, result, idx_info) {
    //chrome.tabs.executeScript({
    //    code: 'document.querySelector(".text_exposed_root:first-child").innerText'
    //}, function(result) {
        $('#result').text('');
        if (className && result) {
            console.log(className, result, result[0], result[0].innerText);
            result.forEach(function(item, idx) {
                $.post('http://localhost:3000/external_api', {
                    url: 'http://home.iacryl.com:7070/', 
                    options: {
                        nlptype: 'aer',
                        text: encodeURIComponent(item.innerText)
                    }
                }, function(res) {
                    console.log(res);
                    if (res.sentences) {
                        var sentences = res.sentences;
                        var all_sentence = '';
                        var main_emotion = '';
                        sentences.map(function(data, i) {
                            var emotions = data.emotions || null;
                            main_emotion += emotions && emotions[0] ? (emotions[0].emotion || '알 수 없음') : '알 수 없음';
                            all_sentence += data.sentence || '';
                            if (i < sentences.length) {
                                main_emotion += ', ';
                            }
                        });

                        //$('#result').html($('#result').html() + '<br>The emotion of "' + all_sentence + '" is "' + main_emotion + '".');
                    
                        var inner_className = className.replace(/\[IDX\]/g, idx_info && idx_info.length ? idx_info[0]*idx + idx_info[1] : idx);
                        console.log(inner_className, idx, idx_info);
                        var script_code = [
                            'var e = document.createElement("p");',
                            'e.innerHTML="The main emotion of this article is ' + main_emotion + '";',
                            'var article = document.querySelector("' + inner_className + '");', // add parentElement in fb
                            'article.insertBefore(e, article.childNodes[0]);'
                        ].join('');

                        if (main_emotion.match(filtering_list)) {
                            script_code += 'article.setAttribute("style", "text-decoration: line-through;");'
                        }
                        
                        chrome.tabs.executeScript(null, {
                            code: script_code
                        }, function() {
                            $('#emotion_check').attr('disabled', true);
                        });
                    } else {
                        $('#result').text('Cannot find any text or emotion.');
                    }
                });
            });
        } else if (result == 'already_check') {
            /*
            var feeling_info = '';
            $('#copy_reply td.reply p').map(function(idx, obj) {
                feeling_info += '<br>' + $(obj).text();
            });
            $('#result').html(feeling_info);
            */
            $('#emotion_check').attr('disabled', true);
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
