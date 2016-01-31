Tasks = new Mongo.Collection('tasks');
Messages = new Mongo.Collection('messages');

if (Meteor.isClient) {

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  // This code only runs on the client
  var module = angular.module('simple-todos',['angular-meteor', 'accounts.ui', 'ngMaterial']);

  function onReady() {
    angular.bootstrap(document, ['simple-todos']);
  }

  if (Meteor.isCordova)
    angular.element(document).on('deviceready', onReady);
  else
    angular.element(document).ready(onReady);

  module.controller('TodosListCtrl', function ($scope, $meteor) {
    $scope.$meteorSubscribe('tasks');
    $scope.$meteorSubscribe('messages');

    $scope.helpers({
      tasks: () => {
        return Tasks.find($scope.getReactively('query'), {sort: {createdAt: -1}})
      },
      //incompleteCount: () => {
      //  Tasks.find({ checked: {$ne: true} }).count()
      //}
    });


    $scope.incompleteCount = function () {
      return Tasks.find({ checked: {$ne: true} }).count();
    };

    $scope.messages = $meteor.collection( function() {
      return Messages.find({}, {sort: {createdAt: -1}})
    });

    $scope.addTask = function (newTask) {
      $meteor.call('addTask', newTask);
    };

    $scope.addMessage = function (body) {
      $meteor.call('addMessage', body);
    };

    $scope.deleteTask = function (task) {
      $meteor.call('deleteTask', task._id);
    };

    $scope.setChecked = function (task) {
      $meteor.call('setChecked', task._id, !task.checked);
    };

    $scope.setPrivate = function (task) {
      $meteor.call('setPrivate', task._id, !task.private);
    };

    $scope.$watch('hideCompleted', function() {
      if ($scope.hideCompleted)
        $scope.query = {checked: {$ne: true}};
      else
        $scope.query = {};
    });

  });
}

Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  addMessage: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Messages.insert({
      body: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error('not-authorized');
    }

    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});

if (Meteor.isServer) {
  Meteor.publish('tasks', function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });

  Meteor.publish('messages', function () {
    return Messages.find({});
  });
}