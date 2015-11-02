import Ember from 'ember';
import EditView from '../views/edit-view';

export default Ember.Component.extend({
  classNames: ['upload-photo'],
  classNameBindings: ['status', 'dragClass', 'isEmpty', 'isReplacing', 'isUploading', 'hasError'],
  isEmpty: null,
  hasError: false,
  dragClass: 'deactivated',
  mimeTypes: ['image/jpeg', 'image/jpg', 'image/gif', 'image/png', 'text/plain'],
  extensions: ['jpeg', 'jpg', 'gif', 'png'],
  requestHeaders: {
    'Authorization': 'Token ' + localStorage.distillery_authToken
  },
  dragLeave: function(event) {
    event.preventDefault();
    return this.set('dragClass', 'deactivated');
  },
  dragOver: function(event) {
    event.preventDefault();
    this.set('dragClass', 'activated');
    return false;
  },
  percentComplete: 0,
  uploadStatus: { uploading: false, percentComplete: 0, error: false },
  updateStatus: function() {
    var percent = this.get('percentComplete');
    if(percent > 0) {
      var el = this.$().find('.prog .bar');
      $.Velocity.animate(el, {width: this.get('percentComplete') + '%'});
    }
  }.observes('percentComplete'),
  drop: function(event) {
    if(this.get('isLoaded')) {
      if(event.dataTransfer.files.length) {
        this.$().addClass('confirm');
        this.set('isReplacing', true);
        this.set('dropFile', event.dataTransfer.files[0]);
      }
    } else {
      if(event.dataTransfer.files.length) {
        var file = event.dataTransfer.files[0];
        this.handleDropFile(file);
      }
    }

    event.preventDefault();
    event.stopPropagation();
  },
  resetProgress: function() {
    this.set('percentComplete', 0);
  },
  handleDropFile: function(file) {

    var mimeTypes = this.get('mimeTypes');
    var extensions = this.get('extensions');

    this.resetProgress();
    this.set('dragClass', 'deactivated');
    var fileExt = file.name.split('.').pop();

    if (($.inArray(file.type, mimeTypes) === -1)&&($.inArray(fileExt, extensions) === -1)) {
      Ember.Assert('invalid file');
      return;
    }
    this.send('processFile', file);
  },
  editView: EditView,
  actions: {
    processFile: function(file) {
      var reader = new FileReader();
      reader.onload = function (event) {
        var image = new Image();
        image.src = event.target.result;
        this.sendAction('action', image.src);
        this.set('isLoaded', true);
        this.set('isEmpty', false);
        this.$().addClass('photo-present');
        this.$().css('background-image', 'url(' + image.src + ')');
      }.bind(this);
      reader.readAsDataURL(file);
    }
  },
  _addProgressListener: function(request) {
    request.addEventListener('progress', function (event) {
      Ember.run(function() {
        if (!event.lengthComputable) {
          // There's not much we can do if the request is not computable.
          return;
        }

        var file = this.get('file');

        // Calculate the percentage remaining.
        var percentageLoaded = Math.floor((event.loaded / file.size) * 100);
        this.set('percentComplete', Math.round(percentageLoaded));
      }.bind(this));
    }.bind(this), false);
  },
  _addSuccessListener: function(request) {
    // Once the files have been successfully uploaded.
    request.addEventListener('load', function() {
      Ember.run(function() {

        // We want to revert the upload status.
        this.set('uploadStatus.uploading', false);

        // fade bar out when success is done
        var self = this;
        $.Velocity.animate(this.$().find('.prog .bar'), {opacity: 0}, {delay: 750}).then(function(element){
          self.set('isUploading', false);
          // reset the progress bar
          $(element).css({'width': 0, opacity: 1});
        });

      }.bind(this));
    }.bind(this), false);
  },
  _addErrorListener: function(request, deferred) {
    request.addEventListener('error', function() {
      Ember.run(function() {
        // As an error occurred, we need to revert everything.
        this.set('uploadStatus.uploading', false);
        this.set('uploadStatus.error', true);

        if (deferred) {
          // Reject the promise if we have one.
          deferred.reject();
        }
      }.bind(this));
    }.bind(this));
  },
  triggerClick: function() {
    this.get('hiddenFileInput').click();
  },
  click: function() {
    if(!this.$().hasClass('photo-present')) {
      Ember.run.once(this, 'triggerClick');
    }
  },
  setupHiddenFileInput: function() {
    this.hiddenFileInput = document.createElement("input");
    this.hiddenFileInput.setAttribute("type", "file");
    this.hiddenFileInput.className = "";
    this.hiddenFileInput.style.visibility = "hidden";
    this.hiddenFileInput.style.position = "absolute";
    this.hiddenFileInput.style.top = "0";
    this.hiddenFileInput.style.left = "0";
    this.hiddenFileInput.style.height = "0";
    this.hiddenFileInput.style.width = "0";
    document.body.appendChild(this.hiddenFileInput);
    var self = this;
    this.hiddenFileInput.addEventListener("change", function() {
      var file = this.files[0];
      if(file) {
        self.handleDropFile(file);
      }
    });
  },
  willInsertElement: function() {
    // Disable drag/drop on window when this thing is present
    window.addEventListener("dragover",function(e){
      e = e || event;
      e.preventDefault();
    },false);
    window.addEventListener("drop",function(e){
      e = e || event;
      e.preventDefault();
    },false);
  },
  setThumbnail: function() {

    var controller = this.get('for');
    var field = this.get('field');

    if(controller) {
      var photo = controller.get(field);
      var thumb;
      controller.get(field).then(function(){
        thumb = photo.get('photoUrl');
        if(thumb) {
          this.set('isLoaded', true);
          this.set('isEmpty', false);
          this.$().addClass('photo-present');
          this.$().css('background-image', 'url(' + thumb + ')');
        }
      }.bind(this));
    }
  },
  didInsertElement: function() {
    var controller = this.get('for');
    var field = this.get('field');
    var photo = controller.get(field);
    var self = this;


    Ember.addObserver(controller, field, function(sender, key, value, rev){
      this.setThumbnail();
    }.bind(this));

    this.setupHiddenFileInput();

    if(photo) {
      photo.then(function(item){
        if(item === null) {
          self.set('isEmpty', true);
        } else {
          self.set('isLoading', true);
          self.$().append('<img src="/assets/loading.svg">');
          // @TODO: unthrottle me later!
          Ember.run.later(function() {
            photo.then(function(item){
              self.$().find('img').remove();

              var image = $('<img>', {src: Config.APP.MEDIA_PATH + item.get('image')});

              image.one('load', function(){
                self.$().css('background-image', 'url(' + Config.APP.MEDIA_PATH + item.get('image') + ')');
                self.$().addClass('photo-present');
                self.set('isLoaded', true);
                self.set('isLoading', false);
                self.set('isEmpty', false);
              });

              image.one('error', function(){
                self.set('hasError', true);
              });

            });
          }, 1000);
        }
      });
    } else {
      self.set('isEmpty', true);
    }
  }
});
