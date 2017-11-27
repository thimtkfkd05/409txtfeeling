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
            
            if ($('#copy_reply td.reply.filtered_text').length) {
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
});

var print_emotion = function(check, callback) {
    if (!callback || typeof callback !== 'function') {
        callback = function() {};
    }
    //var get_text = get_text_fb;
    var get_text = get_text_dc; // CHANGE
    get_text(function(className, result, idx_info) {
        progress_work(0, true);
        var total_num = 0;
        var filtered_num = 0;
        if (className && result && check) {
            $('#emotion_check').attr('disabled', true);
            total_num = result.length;
            var count = 0;
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
                            //'var e = document.createElement("p");',
                            //'e.innerHTML="The main emotion of this article is ' + main_emotion + '";',
                            //'e.setAttribute("style", "color: initial;");',
                            'var article = document.querySelector("' + inner_className + '");', // add parentElement in fb
                            //'article.insertBefore(e, article.childNodes[0]);'
                        ].join('');

                        if (main_emotion.match(filtering_list)) {
                            script_code += 'article.setAttribute("style", "color: #eee;");';
                            script_code += 'article.className += " filtered_text";';
                            filtered_num++;
                        }
                        
                        chrome.tabs.executeScript(null, {
                            code: script_code
                        }, function() {
                            count++;
                            var percent = parseInt(filtered_num / total_num / 1000 * 100000, 10);
                            progress_work(percent, true);

                            if (count == total_num) {
                                $('#emotion_check').attr('disabled', false);
                                callback();
                            }
                        });
                    } else {
                        count++;
                        if (count == total_num) {
                            $('#emotion_check').attr('disabled', false);
                            callback();
                        }
                        //$('#result').html($('#result').html() + '<br>Cannot find any text or emotion.');
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
            var percent = parseInt($('#copy_reply td.reply.filtered_text').length / $('#copy_reply td.reply').length / 1000 * 100000, 10);
            progress_work(percent, true);
            callback();
        } else if (check) {
            console.log("No Text Found");
            callback('no_text');
        }
    });
};

$(document).ready(function() {
    var type = 'dc'; // CHANGE
    get_blacklist(type, true);
});

$(document).on('click', '#emotion_check', function() {
    print_emotion(true, function(emotion_err) {
        if (!emotion_err) {
            var list = [];
            var add_list = [];
            var get_text;
            var type = 'dc'; // CHANGE

            chrome.tabs.executeScript(null, {
                code: 'document.querySelector("#gallery_re_contents").innerHTML'
            }, function(result) {
                $('#copy_after').html(result[0]);
                $('#copy_after tbody td.reply.filtered_text').map(function(idx, obj) {
                    if ($(obj).find('.etc_ip').length) {
                        var id = $(obj).find('.etc_ip').text();
                        var text = $(obj).text();
                        var article = text.substring(0, text.indexOf(id));
                        
                        if (list[id]) {
                            list[id].filtered_num++;
                            list[id].article.push(article);
                        } else {
                            list[id] = {
                                filtered_num: 1,
                                article: [article]
                            };
                        }
                    }
                });

                Object.keys(list).map(function(id) {
                    add_list.push({
                        id: id,
                        filtered_num: list[id].filtered_num,
                        article: list[id].article
                    });
                });
                
                $.post('http://localhost:3000/add_blacklist', {
                    list: add_list,
                    type: type
                }, function(res) {
                    if (res.err) {
                        console.log(res.err);
                    } else {
                        get_blacklist(type, false);
                    }
                });
            });
        }
    });
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
        progress_work(0, false);
    } else {
        sub_code += 'setAttribute("style", "color: #eee;");';
        progress_work($('#result .progress-bar').data('value'), false);
    }
    
    var fb_class = '';
    var dc_class = '#gallery_re_contents tbody td.reply';
    chrome.tabs.executeScript(null, { // CHANGE
        code: 'document.querySelectorAll("' + dc_class + '.filtered_text").forEach(function(item) {' +
                  sub_code +
              '});'
    });
});

var get_blacklist = function(type, for_init) {
    var middle = for_init ? print_emotion : function(nothing, callback) {callback();};
    $.get('http://localhost:3000/get_blacklist', {
        type: type
    }, function(res) {
        var list = res.result || [];
        middle(false, function(_err) {
            if (!res.err && !_err) {
                var template = function(id, num) {
                    return [
                        '<tr class="blist_row">',
                            '<td class="col-xs-9"> ' + id + '</td>',
                            '<td class="col-xs-3"> ' + num + '</td>',
                        '</tr>'
                    ].join('');
                };
                list.map(function(item) {
                    $('#blacklist .blist_table tbody').append(template(item.id, item.filtered_num));
                });
            } else {
                console.log(_err);
            }
        });
    });
};

var progress_subwork = function(percent, change_value) {
    progress_subwork(0, change_value);
    if (percent !== 0) {
        setTimeout(function() {
            progress_subwork(percent, change_value);
        }, 1000);
    }
};

var progress_work = function(percent, change_value) {
    var progress_bar = $('#result .progress-bar');
    var progress_text = $('#result .progress-bar .progress-text');
    progress_bar.width(percent + '%');
    progress_text.text(percent + '% Filtered');
    if (change_value) {
        progress_bar.data('value', percent);
    }

    if (percent == 0) {
        progress_bar.removeClass('progress-bar-success').removeClass('progress-bar-warning').removeClass('progress-bar-danger');
    } else if (percent < 30) {
        progress_bar.addClass('progress-bar-success');
    } else if (percent < 70) {
        progress_bar.removeClass('progress-bar-success').addClass('progress-bar-warning');
    } else {
        progress_bar.removeClass('progress-bar-warning').addClass('progress-bar-danger');
    }
};
