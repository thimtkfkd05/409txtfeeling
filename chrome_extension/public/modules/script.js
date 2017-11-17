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
                callback(null, 'already_check');
            } else {
                callback('#gallery_re_contents tbody > tr:nth-child([IDX]) td.reply', document.querySelectorAll('#copy_reply td.reply'), [4, 1]);
            }
        } else {
            callback(null);
        }
    });
};

var filtering_list = /싫음|분노|짜증남|/; // change this by user selection

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
                        $('#result').html($('#result').html() + '<br>Cannot find any text or emotion.');
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

$(document).on('click', '#emotion_check', function() {
    console.log("DEBUG sync set true");
    print_emotion(true);
});

$(document).on('click', '#filter_switch', function() {
    $(this).find('.btn').toggleClass('active');  
    $(this).find('.btn').toggleClass('btn-primary');
    $(this).find('.btn').toggleClass('btn-default');
    
    var clicked = $(this).find('.btn-primary').val() === 'true';
    $('#emotion_check').attr('disabled', !clicked);
    
    var sub_code = 'item.';
    if (!clicked) {
        sub_code += 'removeAttribute("style");';
    } else {
        sub_code += 'setAttribute("style", "color: #eee;");';
    }
    
    var fb_class = '';
    var dc_class = '#gallery_re_contents tbody td.reply';
    chrome.tabs.executeScript(null, {
        code: 'document.querySelectorAll("' + dc_class + '").forEach(function(item) {' +
                  sub_code +
              '});'
    });
});
