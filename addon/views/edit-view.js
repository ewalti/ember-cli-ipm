import Ember from 'ember';
import ReplaceButton from '../views/replace-button';

export default Ember.ContainerView.extend({
  classNames: ['iiu-edit'],
  childViews: ['replaceButton'],
  replaceButton: ReplaceButton
});
