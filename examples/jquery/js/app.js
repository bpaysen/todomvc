jQuery(function ($) {
	'use strict';

	Handlebars.registerHelper('eq', function (a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		},
		store: function (namespace, data) {
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return (store && JSON.parse(store)) || [];
			}
		}
	};

	var App = {
		init: function () {
			this.todos = util.store('todos-jquery');
			this.todoTemplate = Handlebars.compile($('#todo-template').html());
			this.footerTemplate = Handlebars.compile($('#footer-template').html());
			this.bindEvents();

			new Router({
				'/:filter': function (filter) {
					this.filter = filter;
					this.update();
				}.bind(this)
			}).init('/all');
		},
    
		bindEvents: function () {
			$('#new-todo').on('keyup', this.create.bind(this));
			$('#toggle-all').on('change', this.toggleAll.bind(this));
			$('#footer').on('click', '#clear-completed', this.destroyCompleted.bind(this));
			$('#todo-list')
				.on('change', '.toggle', this.toggle.bind(this))
				.on('dblclick', 'label', this.editHighlight.bind(this)) 
				.on('keyup', '.edit', this.editKeyup.bind(this)) 
				.on('focusout', '.edit', this.editAction.bind(this))
				.on('click', '.destroy', this.destroy.bind(this));
		},
    
    		/* The following used to be called render, but has been simplified:
    		will call the new display method (view.render)
    		and will save the data to Local Storage */
    
		update: function () {
			view.render(); // calls the render method to display updates
			util.store('todos-jquery', this.todos); // STORES current todos in local storage
		},
		
		toggleAll: function (e) {
			var isChecked = $(e.target).prop('checked');

			this.todos.forEach(function (todo) {
				todo.completed = isChecked;
			});
			this.update();
		},
    
		getActiveTodos: function () {
			return this.todos.filter(function (todo) {
				return !todo.completed;
			});
		},
		getCompletedTodos: function () {
			return this.todos.filter(function (todo) {
				return todo.completed;
			});
		},
		getFilteredTodos: function () {
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}

			return this.todos;
		},
    
		destroyCompleted: function () {
			this.todos = this.getActiveTodos();
			this.filter = 'all';
			this.update();
		},
	
		indexFromEl: function (el) {
			var id = $(el).closest('li').data('id');
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i;
				}
			}
		},
    
		create: function (e) {
			var $input = $(e.target);
			var val = $input.val().trim();

			if (e.which !== ENTER_KEY || !val) {
				return;
			}

			this.todos.push({
				id: util.uuid(),
				title: val,
				completed: false
			});
			$input.val('');

			this.update();
		},
    
		toggle: function (e) {
			var i = this.indexFromEl(e.target);
			this.todos[i].completed = !this.todos[i].completed;
			this.update();
		},
    
		editHighlight: function (e) {
			var $input = $(e.target).closest('li').addClass('editing').find('.edit');
			$input.val($input.val()).focus();
		},
		editKeyup: function (e) {
			if (e.which === ENTER_KEY) {
				e.target.blur();
			}

			if (e.which === ESCAPE_KEY) {
				$(e.target).data('abort', true).blur();
			}
		},
    
    		/* The following used to be called update, but is more clearly labeled to indicate 
  		that it takes actions: (destroy, falsify, or set value) */
    
		editAction: function (e) {
			var el = e.target;
			var $el = $(el);
			var val = $el.val().trim();

			if (!val) {		
				this.destroy(e); // destroy if no value in field and make .data 'abort' false
				return;
			}

			if ($el.data('abort')) { 
				$el.data('abort', false); // if .data 'abort' true, make false
			} else {
				this.todos[this.indexFromEl(el)].title = val; // set the todo.title to $el.val 
			}

			this.update();
		},
    
        	/* Fixed bug that destroyed Todo with empty field when keyup ESCAPE:
    		.destroy will now only destroy Todo if abort is false. 
    
    		Note that Todo will still be destroyed if any other
    		focusout event occurs (such as clicking outside of the field) */
    
		destroy: function (e) {
      			var el = e.target;
			var $el = $(el);
			
      			if ($el.data('abort')) {
        			this.update();
      			} else {
        			this.todos.splice(this.indexFromEl(e.target), 1);
        			this.update();
      			}
		}
	};

	var view = {
    
    		render: function () {
			var todos = App.getFilteredTodos();
			$('#todo-list').html(App.todoTemplate(todos)); 
			$('#main').toggle(todos.length > 0);
			$('#toggle-all').prop('checked', App.getActiveTodos().length === 0);
			this.renderFooter();
			$('#new-todo').focus();
    		},
		
    		renderFooter: function () {
			var todoCount = App.todos.length;
			var activeTodoCount = App.getActiveTodos().length;
			var template = App.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: App.filter
			});
			$('#footer').toggle(todoCount > 0).html(template);
		},
  	};
	
	App.init();
});
