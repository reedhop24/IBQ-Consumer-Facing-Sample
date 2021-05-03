window.PARSER.symbols = {};

function Field(model, definition) {
  var self = this;
  var _model = model;
  var _id;
  var _name;
  var _description;
  var _help, _help_subject;
  var _tag;
  var _$element, _$container, _$placeholder;
  var _type;
  var _input, _input_onetime;
  var _widget;
  var _length;
  var _choices, _choices_onetime, _new_choices;
  var _rules;
  var _code;
  var _hidden;
  var _active;
  var _inline_models = [];
  var _disallow = {};

  var _raw_value;

  _id = GUID.New();
  _name = definition.name;

  _description = definition.description || "";
  _help = definition.help || undefined;
  _help_subject = definition.help_subject || undefined;
  _type = definition.type || "text";
  _input = definition.input || "text";
  _length = definition.length;
  _choices = _new_choices = definition.choices || undefined;
  _rules = definition.rules || undefined;
  _code = definition.code || undefined;
  _hidden = false;
  _active = true;

  logger.debug("Created field: " + _model.get_id() + ":" + _name + " @" + _id);

  _$placeholder = _model.get_container().find(Utils.selector_by_model_field(_model.get_id(), _name));

  if (!_$placeholder.length) {
    var $container = _model.get_container();
    var parsed_html;
    var $html;

    logger.debug("Using a dynamic placeholder");

    if ($container.length > 1) {
      $container = $container.first();
    }

    if ($container.hasClass("branch")) {
      var $step = $container.find(".step").first();

      if ($step.length) {
        $container = $step;
      }
    }

    parsed_html = $.parseHTML("\
      <div class=\"row field-container\">\
        <div class=\"col-md-5\">\
          <label class=\"field-description\">" + _description + " (" + _name + ")</label>\
        </div>\
        <div class=\"col-md-7\">\
          <ul class=\"data-list\">\
            <li>\
              <input class=\"form-control input-lg\" data-model=\"" + _model.get_id() + "\" name=\"" + _name + "\" type=\"text\" disabled>\
            </li>\
          </ul>\
        </div>\
      </div>\
    ");
    $html = $container.append(parsed_html);

    _$placeholder = $container.find(Utils.selector_by_model_field(_model.get_id(), _name));
  }
  if (_$placeholder.length != 1) {
    logger.error("Field", _name, "has too many placeholders:", _$placeholder.length);
    throw "Too many placeholders";
  }

  _$container = _$placeholder.closest(".field-container");
  _$container.show();

  if (_$placeholder.filter("[data-placeholder]").length) {
    _$placeholder.attr("data-placeholder", _description);
  }

  _widget = _$placeholder.attr("data-widget") || undefined;

  self.get_id = function() {
    return _id;
  }

  self.get_name = function() {
    return _name;
  }

  self.get_model = function() {
    return _model;
  }

  self.get_form = function() {
    return _model.get_form();
  };

  self.get_code = function() {
    return _code;
  }

  self.get_type = function() {
    return _type;
  }

  self.get_element = function() {
    return _$element;
  };

  self.is_updated = function() {
    return !(_raw_value == (_raw_value = _$element.val()));
  };

  self.choices = function(choices) {
    if (choices instanceof Array) {
      _new_choices = choices;
    }

    return _choices;
  };

  self.rules = function(rules) {
    if (typeof rules == "string") {
      _rules = rules;
    }

    return _rules;
  };

  self.read_only = function(flag) {
    if (!_$element) return undefined;

    if (typeof flag == "undefined")
      return _$element.attr("disabled");

    if (flag) {
      _$element.attr("disabled", flag);
    }
    else {
      _$element.removeAttr("disabled");
    }

    _$element.trigger("disabled", [flag]);

    return flag;
  };

  self.reset = function() {
    _$element.val("");
    self.errors();
  };

  self.is_visible = function() {
    var target;

    if (!_$container) return undefined;

    return _$container.is(":visible");
  };

  self.active = function(flag) {
    if (typeof flag == "undefined") {
      return _active;
    }

    _active = flag;

    switch (flag) {
      case false:
        self.hidden(true);
        break;
    }

    return _active;
  }

  self.hidden = function(flag) {
    if (!_$container) return undefined;

    if (typeof flag == "undefined") {
      return _hidden;
    }

    _hidden = flag;

    switch(flag) {
      case true:
        self.errors(); // Clear errors when hiding.
        _$container.hide();
        break;

      case false:
        _$container.show();
        break;
    }

    return _hidden;
  };

  self.render = function() {
    var form;
    var prefix;
    var input;
    var choices;
    var $placeholder;
    var placeholder_id;

    if (!_model) {
      logger.error("Field", _id, "does not belong to any model");
      return;
    }

    $placeholder = _$element ? _$element : _$placeholder;

    if (!$placeholder.length) {
      throw "Missing placeholder";
    }

    if ($placeholder.length > 1) {
      throw "Too many placeholders";
    }

    placeholder_id = $placeholder.attr("id");

    input = _input_onetime ? _input_onetime : _input;
    switch(input) {
      case "select":
        _tag = "SELECT";
        break;

      case "textarea":
        _tag = "TEXTAREA";
        break;

      default:
        _tag = "INPUT";

        if ($placeholder.attr("type") == "tel") {
          input = "tel";
        }
        break;
    }

    if (_$element && placeholder_id == _id && _tag == $placeholder.prop("tagName")) {
      // It's a custom widget, so the standard handling does not happly.
      if (_widget) {
        return;
      }

      switch(_tag) {
        case "SELECT":
          var val;

          if (_new_choices) {
            _choices = _new_choices;
            _new_choices = undefined;

            logger.debug("Refreshing select options:", _name);
            val = $placeholder.val();
            $placeholder.empty();
            if (_choices) {
              // Prepend empty option if it does not exist.
              if (!_choices.length || _choices[0][0]) {
                _choices.unshift(["", ""]);
              }

              for(var i = 0; i < _choices.length; i++) {
                var length = _choices[i].length;

                option = $("<option>");
                option.text(_choices[i][length > 1 ? 1 : 0]);
                option.val(_choices[i][0]);
                if (length > 2 && typeof _choices[i][2] == "object") {
                  for(var key in _choices[i][2]) {
                    option.data(key, _choices[i][2][key]);
                  }
                }
                $placeholder.append(option);
              }
            }
            $placeholder.val(val);
            if (val && !$placeholder.val()) {
              _$element.trigger("change", [false]);
            }
          }
          self.read_only(!_choices || !!!_choices.length);
          break;

        default:
          break;
      }
      _input_onetime = undefined;

      // logger.debug("Rendering skipped:", _name);
      return;
    }

    if (!_widget) {
      if (_tag == "SELECT" && $placeholder.prop("tagName") != "SELECT") {
        $placeholder.wrap("<div class=\"select-field\">");
      }
      else if (_tag != "SELECT" && $placeholder.prop("tagName") == "SELECT") {
        $placeholder.select2("destroy");
        $placeholder.closest(".select-field").contents().unwrap();
      }
    }

    _$element = $("<" + _tag + ">");
    switch(_tag) {
      case "INPUT":
        _$element.attr({'type': input, 'autocomplete': "on"});
        break;

      case "SELECT":
        var val;

        if (_new_choices) {
          _choices = _new_choices;
          _new_choices = undefined;

          logger.debug("Refreshing select options:", _name);
          if (_choices) {
            // Prepend empty option if it does not exist.
            if (!_choices.length || _choices[0][0]) {
              _choices.unshift(["", ""]);
            }

            for(var i = 0; i < _choices.length; i++) {
              var length = _choices[i].length;

              option = $("<option>");
              option.text(_choices[i][length > 1 ? 1 : 0]);
              option.val(_choices[i][0]);
              if (length > 2 && typeof _choices[i][2] == "object") {
                for(var key in _choices[i][2]) {
                  option.data(key, _choices[i][2][key]);
                }
              }
              _$element.append(option);
            }
          }
        }
        self.read_only(!_choices || !!!_choices.length);
        break;
    }

    _$element.attr("id", _id);
    _$element.attr("name", _name);
    _$element.attr("autocomplete", "off");

    // Don't copy the value during initialization.
    if (placeholder_id == _id) {
      _$element.val($placeholder.val());
    }
    _$element.attr("disabled", $placeholder.attr("disabled"));

    // FIXME: Not all properties are common to all HTML elements.

    if ($placeholder.attr("class")) {
      _$element.attr("class", $placeholder.attr("class"));
    }
    if ($placeholder.attr("style")) {
      _$element.attr("style", $placeholder.attr("style"));
    }
    if ($placeholder.attr("placeholder")) {
      _$element.attr("placeholder", $placeholder.attr("placeholder"));
    }
    if ($placeholder.attr("style")) {
      _$element.attr("style", $placeholder.attr("style"));
    }
    if ($placeholder.attr("onChange")) {
      _$element.attr("onChange", $placeholder.attr("onChange"));
    }

    if ($placeholder.data()) {
      $.each($placeholder.data(), function(key, value) {
        key = "data-" + key;
        _$element.attr(key, value);
      });
    }

    switch(_type) {
      case "integer":
        if (_tag == "INPUT") {
          // _$element.attr("type", "number").attr("inputmode", "numeric").attr("pattern", "[0-9]*");
          // Work-around to prevent a year field from getting thousands separators.
          if (!_$element.attr("data-mask")) {
            _$element.attr("data-mask", "#,##0,000").attr("data-mask-reverse", "true");
          }

          _$element.attr("type", "tel");
        }
        break;

      default:
        break;
    }

    if (_length) {
      _$element.attr("maxlength", _length)
    }

    $placeholder.replaceWith(_$element);

    _$container = _$element.closest(".field-container");

    // Set field label
    var $label = _$container.find("label:empty");

    if ($label.length) {
      $label.attr("for", _id).html(_description.replace(/(\r\n|\n\r|\r|\n)/g, "<br/>"));
    }

    // Set field placeholder
    var placeholder_text = _$element.attr("data-placeholder") || undefined;

    if (placeholder_text && !_$element.attr("placeholder")) {
      _$element.attr("placeholder", placeholder_text);
    }

    // Show help
    if (_help) {
      if ($label.length) {
        // Show help icon next to the label, if label is present.
        var $help = $label.append(" <span class=\"glyphicon glyphicon-question-sign help-icon\"></span>").children().first();
            $help.data({
              'target': $help,
              'subject': _help_subject ? _help_subject : _$element.attr("name"),
              'content': _help.replace(/(\r\n|\n\r|\r|\n)/g, "<br/>"),
            });
      }
      else {
        // Show help icon next the input field.
        var $help = _$element.after("<span class=\"glyphicon glyphicon-question-sign help-icon\" style=\"position: absolute; right: 0; top: 1em;\"></span>").next();
            $help.data({
              'target': $help,
              'subject': _help_subject ? _help_subject : _$element.attr("name"),
              'content': _help.replace(/(\r\n|\n\r|\r|\n)/g, '<br/>'),
              'position': "vertical",
            });
        _$element.css({'width': "calc(100% - 20px)"});
      }
    }

    if (_tag == "INPUT" && _input == "text" && _$element.attr("data-mask")) {
      var reverse = _$element.attr("data-mask-reverse") == "true" ? true : false;

      _$element.mask(_$element.attr("data-mask"), {'reverse': reverse});
    }

    // Beautify select drop-downs
    if (_tag == "SELECT" && !_widget && !_$element.hasClass("select2-hidden-accessible")) {
      _$element.select2({placeholder: placeholder_text ? placeholder_text : "Click to select", theme: "bootstrap", width: "100%"});
      _$element.on("select2:open", function(e) {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) {
          $(".select2-search__field").attr("readonly", true);
          setTimeout(function() {
            $(".select2-search__field").attr("readonly", false);
          }, 500);
        }
      });
    }

    if (_tag == "SELECT" && _widget == "RadioSelect") {
      _$element.RadioSelect({});
    }

    // Add date widget
    if (_type == "date") {
      if (_$element.attr("data-widget") == "TFDate") {
        _$element.TFDate({mapClass: false});
      }
      else {
        var fix = new Date();

        fix.setFullYear(fix.getFullYear() + 2);
        fix.setMonth(11);
        fix.setDate(31);

        if (_$element.data("today")) {
          _$element.val(Utils.date_to_string(new Date()));
        }

        _$element.pickadate({
          format: "mm/dd/yyyy",
          min: new Date(new Date(fix).setFullYear(fix.getFullYear() - 122)),
          max: fix,
          selectMonths: true,
          selectYears: 122,
          onSet: function() {
            $(_$element).trigger("blur");
          }
        });
      }
    }

    // Fix for older browsers that do not support the placeholder attribute
    Modernizr.on("placeholder", function(result) {
      if (!result) {
        _$element.placeholder();
      }
    });

    _$element.on("field.reset", function(event) {
      $(this).val("");
      self.errors();
    });

    _$element.on("focus", function(event) {
      // Store the current value before it is updated.
      self.is_updated();
    });

    _$element.on("blur", function(event, validate) {
      var errors;
      var new_value;

      /*
        For cases when we want to notify other code about a value change,
        but we don't need (or want) to trigger validation.
      */
      if (validate === false) {
        logger.debug("Skipped validation:", _name);
        return;
      }

      // Do not re-validate if the value did not change.
      if (!self.is_updated()) {
        return;
      }

      self.validate(self)
        .done(function(field) {
          field.errors();
          $(document).trigger("form.validator", [field]);
        })
        .fail(function(field, errors) {
          field.errors(errors);
          // if (!field.value()) {
            $(document).trigger("form.validator", [field]);
          // }
        });
    });

    if (_tag == "SELECT") {
      _$element.on("change", function(event, validate) {
        $(this).trigger("blur", [validate]);
      });
    }

    if(_name === 'Address') {
      $('#google-maps')[0].src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyDimdTDogeyWcGr-Pmf9PKRwFpZqrvZvuI&callback=IBQ.initMap&libraries=places&v=weekly"
    }

    _input_onetime = undefined;

    logger.debug(_name, "rendered as", _tag);
  };

  self.destroy = function() {
    self.errors();

    _$element.off("focus");
    _$element.off("blur");

    _$container.find("label[for=\"" + _id + "\"]").removeAttr("for").empty();

    if (_tag == "SELECT" && !_widget) {
      _$element.on("change");
      _$element.select2("destroy");
    }

    if (typeof _$element.data("mask") == "object") {
      _$element.unmask();
    }

    if (_$element.data("DateTimePicker")) {
      _$element.data("DateTimePicker").destroy();
    }

    if (_$element.attr("data-widget") == "TFDate") {
      _$element.TFDate("destroy");
    }

    if (_$element.attr("data-widget") == "RadioSelect") {
      _$element.RadioSelect("destroy");
    }

    _$element.replaceWith(_$placeholder);
    _$element = undefined;
    _$container = undefined;

    if (_$placeholder.prop("tagName") == "SELECT") {
      _$placeholder.closest(".select-field").contents().unwrap();
    }

    logger.debug("Destroyed field:", _id);

    return true;
  };

  self.errors = function(messages) {
    // var $box;

    // switch(_tag) {
    //   case "SELECT":
    //     $box = _$element.closest(".select-field");
    //     break;

    //   default:
    //     $box = _$element;
    //     break;
    // }

    // $box.css("border", "");
    _$element.closest("li").removeClass("has-error").children(".error").remove();
    if (messages && messages.length) {
      messages.forEach(function(message) {
        _$element.closest("li").addClass("has-error").append(
          "<div class=\"error\">" + message + "</div>");
      });
      // $box.css("border", "1px solid red");
    }
  };

  self.validate = function(context) {
    var deferred = new $.Deferred;
    var is_async = false;

    var apply_active = true;
    var apply_hidden = false;
    var apply_readonly = false;
    var apply_freeform = false;
    var skip_next_rule = false;
    var inline_models = [];
    var value;
    var errors = [];

    // logger.debug("Field validation:", _name, context ? (context.get_name ? context.get_name() : (context.get_id ? context.get_id() : context)) : context);

    self.read_only(true);

    // Hide the field if the parent model is inactive (hidden).
    apply_hidden = !_model.is_active();

    value = _$element.val() || "";
    value = value.replace(/^\s+|\s+$/g, "");

    if(_disallow.hasOwnProperty(value)) {
      self.reset();
      $.modal.defaults = {
        closeExisting: true,    // Close existing modals. Set this to false if you need to stack multiple modal instances.
        escapeClose: false,      // Allows the user to close the modal by pressing `ESC`
        clickClose: false,       // Allows the user to close the modal by clicking the overlay
        closeClass: 'modal-button'
      };
      $('#auto-modal-driver').modal();
      $('#incident-desc-list').empty();
      $('#incident-desc-list').append('<li>' + _disallow[value] +'</li>')
    }

    if (value) {
      var choices = _choices_onetime ? _choices_onetime : _choices;

      switch(_type) {
        case "integer":
          value = value.replace(/,/g, "");
          if (! /^(?:0|[-]?[1-9][0-9]*)$/.exec(value)) errors.push("Value must be a number");
          break;

        case "float":
          if (! /^(?:0|[-]?[1-9][0-9]*)(?:\.[0-9]+)?$/.exec(value)) errors.push("Value must be a number");
          break;

        case "date":
          if (! /^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/.exec(value)) errors.push("Date must be in MM/DD/YYYY format");
          break;

        case "text":
          if (choices && $.inArray(value, choices) === false) errors.push("Value not allowed");
          break;
      }
    }

    if (errors.length) {
      skip_next_rule = true;
    }

    if (_rules) {
      window.PARSER.symbols.context = _model;

      try {
        var rules = window.PARSER.parse(_rules);

        skip_next_rule |= !_model.is_active();

        rules.forEach(function(rule) {
          var matches = /^([^ ]+)(?:[ ]+(.*))?$/.exec(rule);
          var command = matches[1];
          var arg = matches[2];

          if (skip_next_rule) return;

          switch(command) {
            case "HIDDEN":
              self.value("");
              apply_active = false;
              skip_next_rule = true;
              break;

            case "INVISIBLE":
              apply_hidden = true;
              skip_next_rule = true;
              break;

            case "SETFIELD":
              self.value(arg, true);
              break;

            case "DEFAULTVALUE":
              if (!self.value()) {
                self.value(arg, true);
              }
              break;

            case "INVALID":
              errors.push(arg ? arg : "Incorrect value");
              skip_next_rule = true;
              break;

            case "VALID":
              break;

            case "NOTNULL":
              if (value == "") {
                errors.push(arg ? arg : "Cannot be empty");
                skip_next_rule = true;
              }
              break;

            case "REQUIRED":
              if (value == "" || value == "0" || value == 0) {
                if (_choices &&
                    (_choices.length == 1 || 
                     (_choices.length == 2 && !_choices[0][0]))) {

                  self.value(_choices[_choices.length-1][0], true);
                  break;
                }

                errors.push(arg ? arg : "Required");
                skip_next_rule = true;
              }
              break;

            case "READONLY":
              apply_readonly = true;
              skip_next_rule = true;
              break;

            case "FREEFORM":
              _input_onetime = "text";
              apply_freeform = true;
              break;

            case "APILOOKUP":
              var is_complete = true;

              _input_onetime = "select";

              /*
                Prevent API lookups when the field itself changes or when 
                validation is not triggered by a value change in another
                field (e.g. during form submissions).
              */
              if (context == self || context instanceof Field === false) {
                is_complete = undefined;
              }

              var url = arg.replace(/%\(([A-Za-z][A-Za-z0-9_]*)\)/g, function() {
                var value = _model.get_field_by_name(arguments[1]).value();

                if (!value) {
                  is_complete = false;
                }

                return encodeURIComponent(value);
              });
              if (is_complete) {
                logger.debug("APILOOKUP", _name, url);

                // is_async = true;

                $.ajax({
                  method: "GET",
                  url: url,
                  dataType: "json",
                }).
                done(function(data) {
                  logger.debug("Server response:", data);

                  if (data.Status != "Success") {
                    // deferred.resolve(self);
                    return;
                  }

                  _choices_onetime = [];
                  if (data.Result) {
                    /*
                      FIXME: API returns hash instead of array when only
                             one choice is available.
                    */
                    if (data.Result instanceof Array) {
                      data.Result.forEach(function(result) {
                        var option;
                        var display;
                        if(result['Incidents_id']) {
                          if(result['_Disallowed'] == "Yes") {
                            _disallow[result['Incidents_id']] = result['_Display'];
                          }
                        }
                        /*
                          Some records may carry more information than just
                          option label. We extract the label and forward
                          the rest as an array.
                        */
                        option = result[_name];
                        delete result[_name];
                        if ('_Display' in result) {
                          display = result['_Display'];
                          delete result['_Display'];
                        }
                        if (!Object.keys(result).length) {
                          result = undefined;
                        }

                        _choices_onetime.push([option, display ? display : option, result]);
                      });
                    }
                    else {
                      var result = Object.assign({}, data.Result);
                      var option;
                      var display;

                      /*
                        Some records may carry more information than just
                        option label. We extract the label and forward
                        the rest as an array.
                      */
                      option = result[_name];
                      delete result[_name];
                      if ('_Display' in result) {
                        display = result['_Display'];
                        delete result['_Display'];
                      }
                      if (!Object.keys(result).length) {
                        result = undefined;
                      }

                      _choices_onetime.push([option, display ? display : option, result]);
                    }
                  }

                  _input_onetime = "select";
                  self.choices(_choices_onetime);
                  // var __choices_onetime = _choices_onetime;
                  self.render();
                  if (self.default_value()) {
                    self.value(self.default_value(), true);
                    self.remove_default();
                  }
                  else if(!self.value()) {
                    /*
                      Automatically set the value if there's just one
                      option available and the field is required.
                    */

                    if (_choices &&
                        (_choices.length == 1 || 
                         (_choices.length == 2 && !_choices[0][0]))) {

                      for (var i = 0; i < rules.length; i++) {
                        if (rules[i] == "REQUIRED") {
                          self.value(_choices[_choices.length-1][0], true);
                          break;
                        }
                      }
                    }
                  }

                  // deferred.resolve(self);
                }).
                fail(function() {
                  errors.push("Unable to contact IBQ");
                  // deferred.reject(self, errors);
                }).
                always(function() {
                  // self.read_only(false);
                });
              }
              else {
                logger.debug("Incomplete APILOOKUP: " + _name);

                skip_next_rule = true;
                apply_readonly = true;
              }
              break;

            case "APIVALIDATE":
              var is_complete = true;
              var is_valid = false;

              /*
                Prevent API lookups when the field itself didn't change.
              */
              if (context != self && context instanceof Field === true) {
                is_complete = false;
              }

              var url = arg.replace(/%\(([A-Za-z][A-Za-z0-9_]*)\)/g, function() {
                var value = _model.get_field_by_name(arguments[1]).value();
                if (!value) is_complete = false;

                return encodeURIComponent(value);
              });
              if (is_complete) {
                logger.debug("APIVALIDATE", _name, url);

                is_async = true;

                $.ajax({
                  method: "GET",
                  url: url,
                  dataType: "json",
                })
                  .done(function(data) {
                    logger.debug("Server response:", data);
                    if (data.Status == "Success") {
                      // Don't overwrite self.
                      if (data[_name]) {
                        delete data[_name];
                      }

                      // FIXME: Apply obtained data to model. But does it make any sense?
                      _model.from_hash(data);

                      deferred.resolve(self);
                    }
                    else {
                      var api_errors;

                      api_errors = data.Error.map(function(e) { return e.ErrorMsg; });
                      errors.push.apply(errors, api_errors);
                      logger.warn(_name, "validation failed:", errors);

                      deferred.reject(self, errors);
                    }
                  })
                  .fail(function() {
                    errors.push("Unable to verify VIN");
                    logger.error("Request failed:", arguments);

                    deferred.reject(self, errors);
                  });
              }
              else {
                logger.debug("Deferring APIVALIDATE:", _name);
              }
              break;

            case "DOMODEL":
              inline_models.push(arg);
              _model.enable_inline(arg);
              break;

            default:
              logger.error("Unsupported API command:", command);
              break;
          }
        });
      } catch(e) {
        if (e.name === "SyntaxError") {
          logger.error("Rule parsing error:", _rules);
          logger.error(e);
          errors.push("Incorrect value");
        }
        else throw e;
      }
    }

    if (self.active() !== apply_active) {
      apply_hidden = !apply_active;
      self.active(apply_active);
    }

    if (self.active()) {
      if (self.hidden() !== apply_hidden) {
        self.hidden(apply_hidden);
      }

      if (self.read_only() !== apply_readonly) {
        self.read_only(apply_readonly);
      }

      if (!self.hidden() && !self.read_only()) {
        if (_code) {
          _code(context, self);
        }
      }

      if (_inline_models.length > 0) {
        var to_remove = [];

        /*
          FIXME: Optimize to only do this in one loop.
        */

        // Find inlines to be removed.
        for (var i = 0; i < _inline_models.length; i++) {
          if (inline_models.indexOf(_inline_models[i]) < 0) {
            to_remove.push(i);
          }
        }

        // Actually remove the selected inlines. 
        for (var i = 0; i < to_remove.length; i++) {
          _model.disable_inline(_inline_models[i]);
          _inline_models.splice(to_remove[i], 1);
        }
      }

      _inline_models = inline_models;
    }

    self.render();

    // Simple checks can return immediately.
    if (!is_async) {
      if (errors.length) {
        logger.warn(_name, "validation failed:", errors);
        if (self.is_visible()) {
          return deferred.reject(self, errors).promise();
        }
        else {
          return deferred.resolve(self).promise();
        }
      }
      return deferred.resolve(self).promise();
    }
    // Asynchronous checks will return later.
    return deferred.promise();
  }

  self.remove_default = function() {
    _$element.removeAttr("data-default").removeData("default");
  }

  self.default_value = function(value) {
    if (!_$element || !_$element.length) {
      logger.warn(_id, "does not have a DOM object");
      return undefined;
    }

    if (typeof value == "undefined") {
      return _$element.data("default");
    }

    _$element.attr("data-default", value);
    return value;
  };

  self.value = function(value, trigger) {
    if (!_$element || !_$element.length) {
      logger.warn(_id, "does not have a DOM object");
      return undefined;
    }
    if (typeof value == "undefined") {
      var rval;

      switch(_type) {
        case "boolean":
          rval = _$element.is(":checked");
          break;

        case "integer":
          var val = _$element.val();

          rval = val ? parseInt(val.replace(/,/g, "")) : undefined;
          if (rval && isNaN(rval)) {
            rval = undefined;
          }
          break;

        case "float":
          var val = _$element.val();

          rval = val ? parseFloat(val) : undefined;
          if (rval && isNaN(rval)) {
            rval = undefined;
          }
          break;

        case "date":
          var val = _$element.val();
          if (val)
          {
            try {
              var d = _$element.val().split(/\D/);

              rval = new Date();
              rval.setYear(parseInt(d[2]));
              rval.setMonth(parseInt(d[0]) - 1);
              rval.setDate(parseInt(d[1]));

              if (rval instanceof Date === false || isNaN(rval.getTime())) {
                rval = undefined;
              }
              else {
                rval.toString = function() { return Utils.date_to_string(this); };
                rval.toJSON = function() { return Utils.date_to_string_iso(this); };
              }
            }
            catch(e) {
              rval = undefined;
            }
          }
          break;

        default:
          rval = _$element.val();
      }
      return rval;
    }

    switch(_type) {
      case "boolean":
        _$element.attr("checked", value ? true : false);
        break;

      case "date":
        var d;

        // If it's a Date object, strigify it.
        if (value instanceof Date) {
          value = isNaN(value.getTime()) ? "" : Utils.date_to_string(value);
        }
        else if (d = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value)) {
          value = d[2] + "/" + d[3] + "/" + d[1];
        }
        _$element.val(value);
        break;

      default:
        _$element.val(value);
        break;
    }

    if (trigger) {
      if (_tag == "SELECT") {
        _$element.trigger("change");
      }
      else {
        _$element.trigger("blur");
      }
    }
    return self.value();
  };

  self.choices_as_hash = function() {
    var choices = {};

    for (var i = 0; _choices && i < _choices.length; i++) {
      if (!_choices[i][0]) {
        continue;
      }

      choices[_choices[i][0]] = _choices[i][_choices[i].length > 1 ? 1 : 0];
    }

    return choices;
  };

  // self.value_as_string = function() {
  //   var value = self.value();

  //   if (typeof value == "undefined") {
  //     return "";
  //   }

  //   switch(_type) {
  //     case "boolean":
  //       value = !!(value) ? "1" : "0";
  //       break;

  //     case "date":
  //       value = Utils.date_to_string(value);
  //       break;

  //     default:
  //       break;
  //   }

  //   return value;
  // }
}

function Inline(parent, name, schema) {
  var self = this;

  var _name;
  var _schema;
  var _parent;
  var _$element;
  var _$container;
  var _$content;
  var _instances = {};

  _parent = parent;
  _name = name;
  _schema = schema;

  _$element = _parent.get_container().find("[data-container=\"inline\"][data-model=\"" + _name + "\"]");
  
  if (!_$element || !_$element.length) {
    var $container = _parent.get_container();

    logger.debug("Creating an inline container:", _name);

    _$element = $("<div>", {'data-container': "inline", 'data-model': _name});
    _$element.append($("<div>", {'data-container': "template"}));
    $container.append(_$element);
  }

  _$element.hide();

  if (_$element.length > 1) {
    logger.error("Multiple inline containers are not supported:", _name);
    return undefined;
  }

  _$container = _$element.children("[data-container=\"template\"]");

  if (_$container.length > 1) {
    logger.error("Multiple inline container templates are now allowed:", _name);
    return undefined;
  }

  // Remember the existing template and remove it from the DOM tree.
  _$content = _$container.clone().contents();
  _$container.empty();

  _$element.find("[data-action]").on("click", function(event) {
    var action = $(this).attr("data-action");
    switch (action) {
      case "add":
        return self.add_model();

      default:
        logger.warn("Unsupported action:", action);
        break;
    }
  });

  logger.info("Initalized inline:", _name);

  self.get_name = function() {
    return _name;
  };

  self.get_element = function() {
    return _$element ? _$element : _parent.get_container();
  };

  self.get_container = function() {
    return _$container ? _$container : self.get_element();
  };

  self.get_form = function() {
    return _parent instanceof Form ? _parent : _parent.get_form(); 
  };

  self.add_model = function(id) {
    var $content;

    // Automatically assign model id if none is given.
    if (typeof id == "undefined") {
      id = GUID.New();
    }

    if (_instances[id]) {
      logger.error("Duplicate model instance", id);
      return undefined;
    }

    $content = _$content.clone();

    $content.attr("data-instance", id);
    $content.find("[data-model]").attr("data-instance", id);
    $content.find("[data-action]")
            .on("click", function(event) {
              var action = $(this).attr("data-action");

              switch (action) {
                case "delete":
                  return self.remove_model(id);

                default:
                  logger.warn("Unsupported action:", action);
                  break;
              }
            });
    _$container.append($content);

    _instances[id] = new Model(self, _name, id, $content);
    _instances[id].from_json(_schema[0]);
    _instances[id].render();

    // Show the container in case it is hidden.
    _$element.show();

    return _instances[id];
  };

  self.remove_model = function(id) {
    var $element;

    if (!_instances[id]) {
      logger.error("Requested model instance does not exist:", id);
      return false;
    }

    $element = _instances[id].get_element();
    _instances[id].destroy();
    delete _instances[id];
    $element.remove();

    // Hide the entire container if the last inline was removed.
    if (!Object.keys(_instances).length) {
      _$element.hide();
    }

    $(document).trigger("form.validator", [self]);

    return true;
  };

  self.reset = function() {
    for(id in _instances) {
      self.remove_model(id);
      _$container.children("[data-instance=\"" + id + "\"]").remove();
    }
  };

  self.destroy = function() {
    self.reset();

    // Restore the orignial template.
    _$container.html(_$content);

    logger.debug("Destroyed inline:", _name);
  };

  self.render = function() {
  };

  self.validate = function(context) {
    var deferred = new $.Deferred;
    var promises = [];

    if (!Object.keys(_instances).length) {
      return deferred.resolve().promise();
    }

    $.each(_instances, function(index, instance) {
      var promise = instance.validate(context ? context : self);

      promises.push(promise);
    });

    $.when.apply($, promises)
      .done(function() {
        logger.debug("Inline is valid:", _name);
        deferred.resolve();
      })
      .fail(function() {
        logger.warn("Inline is invalid:", _name);
        deferred.reject();
      })

    return deferred.promise();
  };

  self.as_hash = function() {
    var data = [];

    for(id in _instances) {
      var instance = _instances[id];
      var hash;

      hash = instance.as_hash();
      data.push(hash);
    }

    return data;
  };

  self.from_hash = function(hash) {
    for(var i = 0; i < hash.length; i++) {
      var instance;

      instance = self.add_model();
      instance.from_hash(hash[i]);
    }
  };

  self.count = function() {
    return Object.keys(_instances).length;
  };
}

function Model(parent, name, alias, $element) {
  var self = this;

  var _id = alias || name;
  var _name = name
  var _description = undefined;
  var _rules = undefined;
  var _hidden = false;
  var _inline = parent instanceof Inline ? true : false;
  var _nodelete = false;
  var _$element = $element;
  var _inlines = {};
  var _fields = {};
  var _fields_by_name = {};
  var _parent = parent;

  if (_$element) {
    _$element.attr("data-instance", _id);
    _$element.find("[data-model]").attr("data-instance", _id);
    _$element.removeClass("model-container");
  }

  logger.debug("Initialized model:", _id);

  self.get_id = function() {
    return _id;
  };

  self.get_name = function() {
    return _name;
  };

  self.get_fields = function() {
    return _fields;
  }

  self.get_element = function() {
    return _$element ? _$element : _parent.get_element();
  };

  self.get_container = function() {
    return _$element ? _$element : _parent.get_container();
  };

  self.get_form = function() {
    return _parent instanceof Form ? _parent : _parent.get_form(); 
  };

  self.from_json = function(json) {
    if (_inline && json.Rules) {
      logger.error("Inline models do not support rules:", _id);
      return;
    }

    _rules = json.Rules || undefined;

    if (json.Models) {
      $.each(json.Models, function(name, schema) {
        _inlines[name] = new Inline(self, name, schema);
      });
    }

    $.each(json.Fields, function(name, definition) {
      var field = {};
      var type;

      field.name = name;
      field.description = definition.Description;
      field.rules = definition.Rules || null;
      field.code = definition.Code || undefined;
      field.help = definition.Help || undefined;
      field.help_subject = definition.HelpSubject || undefined;

      type = /^(DATE|INT|BIGINT|BLOB|CHAR|VARCHAR|ENUM)(?:\(([\s\S]*)\))?[;]?$/.exec(definition.Type);
      if (!type) {
        logger.error(field.name, "has an invalid field type definition:", definition.Type);
        return false;
      }
      switch(type[1]) {
        case "BIGINT":
        case "INT":
          if (!type[2]) {
            logger.error(field.name, "definition is missing argument(s):", definition.Type);
            return false;
          }
          field.type = "integer";
          field.length = parseInt(type[2]);
          break;

        case "BLOB":
          field.type = "text";
          break;

        // There is no practical reason to distinguish between these two types.
        case "CHAR":
        case "VARCHAR":
          if (!type[2]) {
            logger.error(field.name, "definition is missing argument(s):", definition.Type);
            return false;
          }
          field.type = "text";
          field.length = parseInt(type[2]);
          break;

        case "DATE":
          field.type = "date";
          field.length = 10;  // YYYY-MM-DD is 10 characters
          break;

        case "ENUM":
          if (!type[2]) {
            logger.warn(field.name, "definition is missing argument(s):", definition.Type);
          }
          field.type = "text";
          field.input = "select";
          try {
            field.choices = type[2].split(/'?,'/)
                                   .filter(function(s) {
                                      return !!s;
                                    })
                                   .map(function(s) {
                                      return s.replace(/^\s+|\s+$/g,'').replace(/^'|'$/g, "").split("|");
                                    });
            for (var i = 0; i < field.choices.length; i++) {
              if (field.choices[i].length > 2) {
                field.choices[i][2] = {'extra': field.choices[i][2]};
              }
            }
          }
          catch (e) {
            field.choices = [];
          }
          break;
      }
      self.add_field(field);
    });
  }

  self.add_field = function(definition) {
    var field;
    field = new Field(self, definition);
    
    field.value("");

    _fields[field.get_id()] = field;
    _fields_by_name[field.get_name()] = field;

    return field;
  };

  self.remove_field = function(field) {
    var id = field.get_id();
    var name = field.get_name();

    if (!_fields[id]) {
      logger.error("Field id does not exist:", id);
      return false;
    }
    if (!_fields_by_name[name]) {
      logger.error("Field name does not exist:", name);
      return false;
    }

    delete _fields[id];
    delete _fields_by_name[name];

    field.destroy();

    return true;
  }

  self.value = function(name) {
    var field = self.get_field_by_name(name);

    if (field) {
      return field.value();
    }

    return undefined;
  };

  self.render = function() {
    $.each(_inlines, function(name, inline) {
      inline.render();
    });
    $.each(_fields, function(id, field) {
      field.render();
    });
    $.each(_fields, function(id, field) {
      field.validate();
    });
  };

  self.get_field_by_name = function(name) {
    var id;

    if (!_fields_by_name[name]) {
      return undefined;
    }

    return _fields_by_name[name];
  }

  self.read_only = function(flag) {
    $.each(_fields, function(id, field) {
      field.read_only(flag);
    });
  }

  self.can_delete = function() {
    return !_nodelete;

    // var nodelete = false;

    // if (_rules) {
    //   var result;

    //   window.PARSER.symbols.context = self;
    //   result = window.PARSER.parse(_rules);

    //   for(var i = 0; i < result.length; i++) {
    //     switch(result[i]) {
    //       case "NODELETE":
    //         nodelete = true;
    //         if (!_nodelete) {
    //           _nodelete = true;
    //         }
    //         break;

    //       default:
    //         break;
    //     }
    //   };
    // }

    // if (!nodelete && _nodelete) {
    //   _nodelete = false;
    // }

    // return !nodelete;
  };

  self.is_active = function() {
    return !_hidden;

    // var hidden = false; // !!_inline;

    // if (_rules) {
    //   var result;

    //   window.PARSER.symbols.context = self;
    //   result = window.PARSER.parse(_rules);

    //   for(var i = 0; i < result.length; i++) {
    //     switch(result[i]) {
    //       case "HIDDEN":
    //         hidden = true;
    //         if (!_hidden) {
    //           _hidden = true;
    //         }
    //         break;

    //       default:
    //         break;
    //     }
    //   };
    // }

    // if (!hidden && _hidden) {
    //   _hidden = false;
    // }

    // return !hidden;
  };

  self.validate = function(context) {
    var deferred = new $.Deferred;
    var promises = [];

    logger.debug("Model validation:", _id);

    if (_rules) {
      var hidden,
          nodelete,
          result;

      window.PARSER.symbols.context = self;
      result = window.PARSER.parse(_rules);

      for(var i = 0; i < result.length; i++) {
        var matches = /^([^ ]+)(?:[ ]+(.*))?$/.exec(result[i]);
        var command = matches[1];
        var arg = matches[2];

        switch(command) {
          case "NODELETE":
            nodelete = true;
            if (!_nodelete) {
              _nodelete = true;
            }
            break;

          case "HIDDEN":
            hidden = true;
            if (!_hidden) {
              _hidden = true;
            }
            break;

          case "DOENDPOINT":
            logger.debug("Ignoring", command, arg);
            break;

          default:
            logger.error("Unknown command:", command);
            throw "Unknown command";
            break;
        }
      }

      if (!nodelete && _nodelete) {
        _nodelete = false;
      }

      if (!hidden && _hidden) {
        _hidden = false;
      }
    }

    $.each(_inlines, function(name, inline) {
      var promise = inline.validate(context ? context : self);

      promises.push(promise);
    });

    $.each(_fields, function(id, field) {
      var promise = field.validate(context ? context : self);

      promise.always(function(field, errors) {
        /*
          Validation errors should only be displayed when:
            - validation was not triggered by another field
              AND
            - the field belongs to a model instance that is currently active
              AND
            - the field itself is active (ie. was not disabled by a rule).
        */ 
        if ((context == field || context instanceof Field === false)
            && self.is_active()
            && field.active()
            && !field.hidden()
            && !field.read_only()
            && field.is_visible()) {
          field.errors(errors);
        }
      });

      promises.push(promise);
    });

    $.when.apply($, promises)
      .fail(function() {
        /*
          A model instance is considered valid when all its fields are valid 
          or when it is inactive regardless of the field values.
        */
        if (self.is_active()) {
          logger.warn("Model is invalid:", _id);
          deferred.reject();
        }
        else {
          logger.warn("Model validation skipped:", _id);
          deferred.resolve();
        }
      })
      .done(function() {
        logger.debug("Model is valid:", _id);
        return deferred.resolve();
      });

    return deferred.promise();
  };

  self.as_hash = function() {
    var hash = {};

    if (_nodelete) {
      hash['_nodelete'] = true;
    }

    $.each(_inlines, function(name, inline) {
      hash[name] = inline.as_hash();
      if (!hash[name].length) {
        delete hash[name];
      }
    });
    $.each(_fields_by_name, function(name, field) {
      if (field.active()) {
        hash[name] = field.value();

        if (field.choices()) {
          if (!hash['_lookup']) {
            hash['_lookup'] = {};
          }

          hash['_lookup'][field.get_name()] = field.choices_as_hash();
        }
      }
    });

    return hash;
  };

  self.from_hash = function(hash) {
    for (key in hash) {
      var value = hash[key];

      if (key.match("^_")) {
        switch (key) {
          case "_nodelete":
            _nodelete = value;
            break;

          default:
            logger.warn("Invalid model key:", _name, key);
            break;
        }

        continue;
      }

      if (value instanceof Array) {
        var inline = _inlines[key];

        inline.from_hash(value);
      }
      else {
        var field = self.get_field_by_name(key);

        if (field) {
          var $element = field.get_element();
          if (typeof $element.data("mask") == "object") {
            value = $element.masked(value);
          }

          field.default_value(value);
          field.value(value, true);
          field.validate();
        }        
      }
    }
  };

  self.reset = function() {
    $.each(_fields, function(id, field) {
      field.value("");
      field.errors();
    });
  };

  self.destroy = function() {
    $.each(_inlines, function(index, inline) {
      inline.destroy();
    });
    $.each(_fields, function(id, field) {
      self.remove_field(field);
    });

    if (_$element) {
      _$element.removeAttr("data-instance");
      _$element.find("[data-instance]").removeAttr("data-instance");
      _$element.addClass("model-container");
    }

    logger.debug("Destroyed model:", _id);

    return true;
  }

  self.enable_inline = function(name) {
    if (!_inlines[name]) {
      logger.error("Inline model", name, "does not exist");
      throw "Model not found";
    }

    if (_inlines[name].count() == 0) {
      logger.debug("Enabling inline model:", name);
      _inlines[name].add_model();
    }
  };

  self.disable_inline = function(name) {
    if (!_inlines[name]) {
      logger.error("Inline model", name, "does not exist");
      throw "Model not found";
    }

    logger.debug("Disabling inline model:", name);
    _inlines[name].reset();
  };

  if (window.DEBUG && window.DEBUG == 2) {
    // window[_id] = this;
  }
}

function Form(module, name, branch, api) {

  var self = this;

  var _oid = GUID.New();
  var _module = module;
  var _api = api;
  var _schema;

  var _id = name;
  var _name = name;
  var _branch = branch;
  var _$element;
  var _models;
  var _data = {};

  self.get_oid = function() {
    return _oid;
  }

  self.get_id = function() {
    return _id;
  };

  self.get_name = function() {
    return _name;
  };

  self.get_schema = function() {
    return _schema;
  };

  self.get_element = function() {
    if (!_$element) {
      var $element;

      if (!_module) {
        return undefined;
      }

      $element = _module.get_element().find(Utils.selector_by_id(branch) + Utils.selector_by_data("form", _name));
      if (!$element || !$element.length) {
        logger.error("Form DOM element not found:", _name);
        return undefined;
      }

      _$element = $element;
    }

    return _$element;
  };

  self.get_container = function() {
    var $element = self.get_element();

    return $element.find(".step");
  };

  self.add_model = function(name, definition) {
    var model;
    var alias = name + (definition.SetField ? definition.SetField.Value : "");
    var $container;

    if (!_schema) {
      _schema = {};
    }

    _schema[name] = definition;

    if (name != alias) {
      logger.debug("Renamed", name, "to", alias);
    }

    if (_models && _models[alias]) {
      logger.error("Conflicting name already exists:", alias);
      return undefined;
    }

    $container = self.get_container().find("[data-container=\"model\"][data-model=\"" + name + "\"]:not([data-instance])").first();

    model = new Model(self, name, alias, $container && $container.length ? $container : undefined);
    model.from_json(definition);

    if (!_models) {
      _models = {};
    }
    _models[alias] = model;
    window.PARSER.symbols[alias] = model;

    model.render();

    return model;
  };

  self.add_models = function(models) {
    $.each(models, function(name, definitions) {
      if (definitions instanceof Array === false) return;

      logger.debug("New model definition:", name);

      for (var i = 0; i < definitions.length; i++) {
        self.add_model(name, definitions[i]);
      }
    });
  };

  self.get_models = function(alias) {
    return _models;
  };

  self.get_model = function(alias) {
    return _models[alias] || undefined;
  };

  self.from_json = function(json) {
    if (json && json.Models) {
      self.add_models(json.Models);
    }
  };

  self.as_payload = function() {
    var payload = {};

    $.each(_models, function(alias, model) {
      var name;
      var hash;

      if (!model.is_active()) {
        return;
      }

      name = model.get_name();
      if (!!!payload[name]) {
        payload[name] = [];
      }

      hash = model.as_hash();

      // Clean up the payload
      for (var key in hash) {
        if (/^_/.test(key)) {
          delete hash[key];
        }
      }

      payload[name].push(hash);
    });

    return payload;
  }

  self.as_hash = function() {
    var data = {
      '_oid': _oid,
      '_form': _name,
    };

    $.each(_models, function(alias, model) {
      if (!model.is_active()) {
        return;
      }
      data[alias] = model.as_hash();

      // Bubble the nodelete flag up.
      if (data[alias]['_nodelete']) {
        data['_nodelete'] = true;
        delete data[alias]['_nodelete'];
      }
    });

    return data;
  };

  self.from_hash = function(hash) {
    hash['_form'] = _name;

    if (hash['_oid']) {
      var data = _module.get_app().data();

      logger.debug("Form OID changes from", _oid, "to", hash['_oid']);

      _oid = hash['_oid'];
      self.get_element().attr("data-oid", _oid);
      data['_OID'] = _oid;
    }

    $.each(_models, function(alias, model) {
      if (hash[alias]) {
        model.from_hash(hash[alias]);
      }
    });
  };

  self.data = function() {
    var data = _module.get_app().data();

    // if (!data[_oid]) {
    //   if (current_if_oid_missing && data[_name] && data[_name]['_current']) {
    //     return data[_name]['_current'];
    //   }
    //   return undefined;
    // }

    // return data[_oid];

    return typeof data[_oid] != "undefined" ? data[_oid] : undefined;
  };

  self.store = function() {
    var data = _module.get_app().data();
    var is_new = !!!data[_oid];

    data[_oid] = self.as_hash();

    if (!data[_name]) {
      data[_name] = [];
    }

    if (is_new) {
      data[_name].push(data[_oid]);
    }
    else {
      for (var i = 0; i < data[_name].length; i++) {
        if (data[_name][i]._oid == _oid) {
          data[_name][i] = data[_oid];
          break;
        }
      }
    }

    return data[_oid];
  };

  self.forget = function(oid) {
    var data = _module.get_app().data();

    for (var i = 0; data[_name] && i < data[_name].length; i++) {
      if (oid == data[_name][i]._oid) {
        data[_name].splice(i, 1);
        break;
      }
    }

    if (data[_oid]) {
      delete data[_oid];
    }
  };

  self.reset = function() {
    $.each(_models, function(alias, obj) {
      obj.reset();
    });
  };

  self.validate = function(context) {
    var deferred = new $.Deferred;
    var promises = [];

    if (!_models) {
      return deferred.resolve().promise();
    }

    $.each(_models, function(alias, obj) {
      var promise = obj.validate(context ? context : self);

      promises.push(promise);
    });

    $.when.apply($, promises)
      .done(function() {
        logger.debug("Form is valid:", _name);
        deferred.resolve();
      })
      .fail(function() {
        logger.warn("Form is invalid:", _name);
        deferred.reject();
      })

    return deferred.promise();
  };

  self.save = function() {
    _api.save(self);
  };

  self.opened = function() {
    _module.opened(self);
  };

  self.saved = function() {
    _module.saved(self);
  };

  self.destroy = function() {
    var data = _module.get_app().data();

    if (_models) {
      $.each(_models, function(alias, obj) {
        obj.destroy();
      });
    }

    delete data['_Form'];
    delete data['_OID'];
    delete data['_New'];

    self.get_element().removeData("oid");
    self.get_element().removeAttr("data-oid");

    logger.debug("Destroyed form:", _name, _oid);

    return true;
  };

  self.can_delete = function() {
    var can_delete = true;

    for (var name in _models) {
      can_delete &= _models.can_delete();
    }

    return can_delete;
  };

  self.init = function(oid) {
    var data = _module.get_app().data();

    if (typeof oid == "undefined") {
      var dom_oid = self.get_element().attr("data-oid");
      if (!dom_oid) {
        self.get_element().attr("data-oid", _oid);
      }
      else {
        logger.debug("Form OID changes from", _oid, "to", dom_oid);
        _oid = dom_oid;
      }      
    }
    else {
      _oid = oid;
      self.get_element().attr("data-oid", _oid);
    }

    data['_OID'] = _oid;
    data['_New'] = !!!data[_oid];
  };

  if (!self.get_element()) {
    return undefined;
  }

  self.init();

  _api.open(self);

  logger.debug("Initialized form:", _name, _oid);
}

function Module(app, name, api) {
  var self = this;
  var _app = app;
  var _name = name;
  var _$element;
  var _form;

  var _api = api;

  logger.debug("Started application:", _name);

  self.get_name = function() {
    return _name;
  };

  self.get_app = function() {
    return _app;
  };

  self.get_element = function() {
    if (!_$element) {
      var $element = $(Utils.selector_by_data("application", _name));

      if (!$element.length) {
        logger.error("Application DOM element is missing:", _name);
        return undefined;
      }
      _$element = $element;
    }

    return _$element;
  };

  self.validate = function(context) {
    var deferred = new $.Deferred;

    if (!_form) {
      logger.warn("No form to validate");
      return deferred.resolve().promise();
    }

    return _form.validate(context ? context : self);
  }

  self.is_open = function() {
    return !!_form;
  };

  self.get_form = function() {
    return _form;
  }

  self.open = function(name, branch) {
    var data = _app.data();

    logger.debug("Opening form:", name);

    if (_form) {
      logger.error("Another form is already open:", _form.get_name());
      return false;
    }

    if (!_api[name]) {
      logger.error("Unknown form:", name);
      return false;
    }

    data['_Form'] = name;

    _form = new Form(self, name, branch, _api[name]);

    $(document).on("form.validator", function(event, context) {
      var models = context.get_form().get_models();

      if (!models) return;

      logger.debug("Form validation triggered by:", context.get_name());
      $.each(models, function(alias, model) {
        model.validate(context);
      });
    });

    return true;
  };

  self.opened = function() {
    _app.opened();
  };

  self.save = function() {
    if (!_form) {
      logger.error("No form to save");
      return false;
    }
    _form.save();
  };

  self.saved = function() {
    _app.saved();
  };

  self.remove = function(form, oid) {
    return _api[form].remove(oid);
  };

  self.close = function() {
    var data = _app.data();

    if (!_form) {
      logger.error("No form to close");
      return;
    }

    delete data['_Form'];

    _form.destroy();
    _form = undefined;

    $(document).off("form.validator");

    return true;
  };
}

function Application(agency_name, application_module) {
  var self = this;

  var _module;
  var _$step;
  var _callbacks = {
    'open': function() {},
    'save': function() {},
  };
  var _data = {
    '_Agency': agency_name,
    'isMGA': false,
    'OMIHousehold': false,
    'OMIHouseholdMembers': 0,
    'Drivers': 0
  };
  var _ibq_session_id;

  self.mga = function(flag) {
    if(flag === 'Yes') {
      _data['isMGA'] = true;
    } else {
      _data['isMGA'] = false;
    }
  }

  self.household = function(ishousehold) {
    _data['OMIHousehold'] = ishousehold;
    if(ishousehold == true) {
      _data['OMIHouseholdMembers'] += 1
    } else {
      _data['Drivers'] += 1
    }
  }

  // FIXME catch exceptions
  _module = new application_module(self);
  _data['_Module'] = _module.get_name();

  self.get_module = function() {
    return _module;
  }


  // Google Maps Prefill Function 
  self.initMap = function() {

      var map = new google.maps.Map($('#map')[0], {
        center: { lat: 47.6050256, lng: -117.3852878 },
        zoom: 13,
      });
    
      let service
      let nBound;
      let eBound;
      let sBound;
      let wBound;
      var city = _module.get_form().get_models()['AddressLocation'].get_field_by_name('City').value();
      var state = _module.get_form().get_models()['AddressLocation'].get_field_by_name('State').value();
  
      var request = {
        query: city + ', ' + state,
        fields: ["name", "geometry","formatted_address"],
      };
      service = new google.maps.places.PlacesService(map);
      service.findPlaceFromQuery(request, (results, status) => {
        if(results.length > 0 && results[0].geometry && results[0].geometry.viewport) {
          var bounds = results[0].geometry.viewport
          var count = 0;

          for(var x in bounds) {
            if(count === 0) {
              sBound = bounds[x].g;
              nBound = bounds[x].i;
            } else if(count === 1) {
              wBound = bounds[x].g;
              eBound = bounds[x].i;
            }
            count++;
          }
          
          var input = _module.get_form().get_models()['AddressLocation'].get_field_by_name('Address').get_element()[0];
          const options = {
            componentRestrictions: { country: "us" },
            fields: ["formatted_address", "geometry", "name"],
            origin: map.getCenter(),
            strictBounds: true,
            types: ["address"],
          };
      
          const autocomplete = new google.maps.places.Autocomplete(input, options);
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            _module.get_form().get_models()['AddressLocation'].get_field_by_name('Address').value(place.formatted_address.split(',')[0], true);
          });
          autocomplete.setBounds({ east: eBound, west: wBound, north: nBound, south: sBound });
        }
      });
  }

  /*
    Returns the currently active form.
  */
  self.validate = function(context) {
    return _module ? _module.validate(context ? context : self) : (new $.Deferred).resolve().promise();
  }

  self.is_open = function() {
    return _module.is_open();
  }

  /*
    Opens a form.
  */
  self.open = function(name, branch, callback) {
    var form;

    if (!_module) {
      logger.error("No application class was loaded");
      return undefined;
    }

    if (typeof callback != "function") {
      callback = function() {};
    }
    _callbacks['open'] = callback;

    form = _module.open(name, branch);

    if (!form) {
      logger.warn("No form was opened");
      return undefined;
    }
  };

  self.opened = function() {
    var callback = _callbacks['open'] || function() {};

    _callbacks['open'] = function() {};

    callback();
  };

  /*
    Saves the open form.
  */
  self.save = function(callback) {
    var data;
    var request;

    if (typeof callback != "function") {
      callback = function() {};
    }
    _callbacks['save'] = callback;

    _module.save();
  };

  self.saved = function() {
    var callback = _callbacks['save'] || function() {};

    _callbacks['save'] = function() {};

    callback();
  };

  /*
    Deletes the form instance.
  */
  self.remove = function(form, oid) {
    return _module.remove(form, oid);
  };

  /*
    Closes the open form.
  */
  self.close = function() {
    _module.close();
  };

  self.data = function() {
    return _data;
  };

  self.save_to_storage = function() {
    if (!window.localStorage) {
      logger.error("Browser storage functions are unavailable");
      return false;
    }

    window.localStorage.setItem("data", JSON.stringify(_data));
    logger.debug("Data saved to the browser session storage");

    return true;
  };

  self.load_from_storage = function() {
    var json;

    if (!window.localStorage) {
      logger.error("Browser storage functions are unavailable");
      return false;
    }

    json = window.localStorage.getItem("data");
    if (json) {
      _data = JSON.parse(json);
      logger.debug("Data loaded from the browser session storage")
    }

    return true;
  };

  self.error = function(messages) {
    if (typeof messages == "undefined") {
      $("#error").hide().empty();
      return;
    }

    if (messages instanceof Array) {
      $("#error").html(messages.join("<br/>")).show();
      return;
    }

    $("#error").text(messages).show();
  };

  self.session_id = function(sid) {
    _ibq_session_id = sid;
  };

  self.request = function(method, url, payload, callback) {
    if (!callback || typeof callback != "function") {
      logger.warn("Empty or invalid callback");

      // Ensures callback is always callable.
      callback = function() {};
    }

    self.ajax(method, url, payload)   
      .done(function(data, status, xhr) { 
        logger.debug("Server response:", data);
        if (data.IBQ_SESSION_ID) {
          logger.debug("New session ID:", data.IBQ_SESSION_ID);
          _ibq_session_id = data.IBQ_SESSION_ID;
        }

        if (data.Status && data.Status != "Success") {
          if (data.Error) {
            var messages;
            // Now handling invalid Addresses and PO boxes with the new Modal 
            messages = data.Error.map(function(e) { if(e.ErrorMsg !== "Address verification error: Bad" 
            && e.ErrorMsg !== "Address verification error: BadBox" && e.ErrorMsg !== "Address verification error: Box" )
            return e.ErrorMsg; });
            if(messages.length > 0 && messages[0] !== undefined) {
              self.error(messages);
            }
          }
        }
        callback(data);
      })
      .fail(function(xhr, status, error) {
        self.error("Rater API is currently unavailable");
        logger.error("Request failed:", xhr, status, error);
        callback();
      });
  };

  self.ajax = function(method, url, payload, config) {
    var request;

    function _evaluate(text) {
      return text.replace(/%\((.+?)\)/g, function() {
        var elements = arguments[1].split(".");

        var ptr = self.data();

        if (!ptr) {
          return "";
        }

        if (elements.length == 2) {
          var oid = ptr['_OID'];

          ptr = ptr[oid];
        }

        for (var i = 0; ptr && i < elements.length; i++) {
          // When in a lookup table, just move to the "current" object.
          // if (typeof ptr == "object" && !ptr[elements[i]] && "_current" in ptr) {
          //   ptr = ptr['_current'];
          // }

          if (!elements[i]) {
            continue;
          }

          if (elements[i].search(/^[0-9]+$/) == 0) {
            var index = parseInt(elements[i]);

            if (ptr instanceof Array === false || index >= ptr.length) {
              logger.warn("Invalid URL parameter:", arguments[1]);
              ptr = undefined;
            }

            ptr = ptr[index];
            // var keys = Object.keys(ptr);

            // ptr = typeof keys[index] != "undefined" ? ptr[keys[index]] : undefined;

            // if (!ptr) {
            //   logger.warn("Invalid URL parameter:", elements[1], "- index out of range:", index);
            // }
          }
          else {
            ptr = ptr[elements[i]] || undefined;

            if (!ptr) {
              logger.warn("Invalid URL parameter:", arguments[1]);
            }
          }
        }
        return !ptr ? "" : ptr;
      });
    }

    let domain = _module.get_name() === 'WC' ? ibq_config.wc_api : ibq_config.api;
    url = domain.replace("%(_Endpoint)", url);

    request = {
      method: method,
      url: _evaluate(url),
      dataType: "json"
    };

    switch (method) {
      case "PATCH":
      case "POST":
      case "PUT":
        request['contentType'] = "application/json; charset=utf-8";
        request['data'] = JSON.stringify(payload);
        break;

      default:
        break;
    }

    if (_ibq_session_id) {
      request['headers'] = {
        'IBQ_SESSION_ID': _ibq_session_id
      };
    }

    if (config) {
      $.extend(request, config);
    }

    logger.debug("Making request:", request.method, request.url);
    if (request['data']) {
      logger.debug("Payload:", payload);
    }

    self.error();

    return $.ajax(request);
  }
}
