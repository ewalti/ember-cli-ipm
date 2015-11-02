import Ember from 'ember';

export default Ember.View.extend({
  tagName: 'button',
  classNames: ['btn', 'btn--light'],
  templateName: 'replace-button',
  click: function(event) {
    this.get('parentView.parentView.hiddenFileInput').click();
    event.stopPropagation();
  }
});
