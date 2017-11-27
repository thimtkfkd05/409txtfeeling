var matching = function(user) {
  chrome.tabs.executeScript({
    code: 'document.querySelector("body").innerText'
  }, function (result) {
    if (result && result[0]) {
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
        code: 'document.querySelector("#gallery_re_contents").innerHTML'
    }, function(result) {
        if (result && result.length) {
            $('#copy_reply').html(result[0]);
            $('#copy_reply td.reply span').remove();
            
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

var filtering_list = '';
$('#filter_list_div input').map(function (idx, obj) {
    if (obj.checked) {
        filtering_list += $(obj).parent().text().trim() + '|';
    }
});
filtering_list = new RegExp(filtering_list);
console.log(filtering_list);

$(document).on('click', '[name="emotion_filter_show"]', function() {
    if ($(this).val() == 'y') {
        $('#filter_list_div').show();
    } else {
        $('#filter_list_div').hide();
    }
});

$(document).on('click', '#filter_list_div input[type="checkbox"]', function() {
    filtering_list = '';
    $('#filter_list_div input').map(function (idx, obj) {
        if (obj.checked) {
            filtering_list += $(obj).parent().text().trim() + '|';
        }
    });
    filtering_list = new RegExp(filtering_list);
    console.log('checkbox: ', filtering_list)
})

var print_emotion = function() {
    //var get_text = get_text_fb;
    var get_text = get_text_dc;
    get_text(function(className, result, idx_info) {
        $('#result').text('');
        if (className && result) {
            result.forEach(function(item, idx) {
                $.post('http://localhost:3000/external_api', {
                    url: 'http://home.iacryl.com:7070/', 
                    options: {
                        nlptype: 'aer',
                        text: encodeURIComponent(item.innerText)
                    }
                }, function(res) {
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
                        var script_code = [
                            'var e = document.createElement("p");',
                            'e.innerHTML="The main emotion of this article is ' + main_emotion + '";',
                            'e.setAttribute("style", "color: initial;");',
                            'var article = document.querySelector("' + inner_className + '");', // add parentElement in fb
                            'article.insertBefore(e, article.childNodes[0]);'
                        ].join('');

                        if (main_emotion.match(filtering_list)) {
                            script_code += 'article.setAttribute("style", "color: #eee;");'
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

chrome.storage.sync.get(function (data) {
  $('#user').val(data.userWords || '');
  //matching(data.userWords);

    if (data.check) {
        print_emotion();
    }
});

/*
$(document).on('change', '#user', function () {
  var user = $(this).val();

  chrome.storage.sync.set({
    userWords: user
  });

  matching(user);
});
*/

$(document).on('click', '#emotion_check', function() {
    chrome.storage.sync.set({
        check: true
    });

    //print_emotion();
});
