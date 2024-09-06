;(function(context) {

    'use strict';
  
    var ENTER_KEY = 13;
    var ESC_KEY = 27;
  
    function App( localStorageKey ) {
  
      this.stores = new Stores(localStorageKey);
      this.currentId = 0;
      this.$insert = $('#js-insert');
      this.$toggleAll = $('#js-toggle-all');
      this.$bar = $('#js-bar');
      this.$list = $('#js-list');
      this.$clearCompleted = $('#js-clear-completed');
      this.$total = $('#js-total');
      this.$filters = $('#js-filters');
      this.addEventListeners();
      this.render();
  
    }
  
    App.fn = App.prototype;
  
    App.fn.addEventListeners = function() {
  
      $.on(this.$insert, 'keypress', this.onInsert.bind(this));
  
      $.on(this.$toggleAll, 'click', this.onToggleAll.bind(this));
      $.delegate(this.$list, '.toggle', 'click', this.onToggle.bind(this));
  
      $.delegate(this.$list, '.destroy', 'click', this.onDestroy.bind(this) );
  
      $.on(this.$clearCompleted, 'click', this.onClearCompleted.bind(this));
  
  
      $.delegate(this.$filters, '.button', 'click', this.onFilter.bind(this));
  
      $.delegate(this.$list, 'span', 'dblclick', this.onStartEditing.bind(this));
      $.delegate(this.$list, '.edit', 'keyup', this.onEditingCancel.bind(this));
      $.delegate(this.$list, '.edit', 'keypress', this.onEditingDone.bind(this));
      $.delegate(this.$list, '.edit', 'blur', this.onEditingLeave.bind(this) );
    };
  
    App.fn.onStartEditing = function(event) {
      var li = $.parent(event.target, 'li');
      var element = $('.edit', li);
      this.currentId = parseInt(li.dataset.id, 10);
      li.className += ' editing';
      element.value = event.target.innerHTML;
      element.focus();
    };
  
    App.fn.onEditingCancel = function(event) {
      if( event.keyCode === ESC_KEY ) {
        console.log('onEditingCancel', event.target);
        event.target.dataset.isCanceled = true;
        event.target.blur();
      }
    };
  
    App.fn.onEditingDone = function(event) {
      if( event.keyCode === ENTER_KEY ) {
        event.target.blur();
      }
    };
  
    App.fn.onEditingLeave = function(event) {
      console.log('onEditingLeave');
      var input = event.target;
      var id = this.getItemId( input );
      var text = input.value.trim();
      var li = this.getElementByDataId( id );
      if( input.value.trim() ) {
        var item = {
          id: id,
          text: text
        };
        this.stores.save(item,this.endEditing.bind(this, li, text));
      } else {
        if( input.dataset.isCanceled ) {
          this.endEditing( li );
        } else {
          this.destroy( id );
        }
      }
    };
  
    App.fn.endEditing = function( li, text ) {
      li.className = li.className.replace('editing', '');
      $('.edit', li).removeAttribute('data-is-canceled');
      if( text ) {
        $('span', li).innerHTML = text;
      }
    };
  
    App.fn.getItemId = function( element ) {
      var li = $.parent(element, 'li');
      return parseInt(li.dataset.id, 10);
    };
  
    App.fn.getElementByDataId = function( id ) {
      return $('[data-id="' + id + '"]');
    };
  
    App.fn.onInsert = function( event ) {
      var element = event.target;
      var text = element.value.trim();
      if( text && event.keyCode === ENTER_KEY ) {
        this.insert(text);
        element.value = '';
      }
    };
  
    App.fn.onToggleAll = function(event) {
      var checked = event.target.checked;
      var self = this;
  
      this.stores.findAll(function( items ) {
        $.each( items, function( item ) {
          item.completed = checked;
          self.stores.save( item, $.noop);
        });
        self.render();
      });
    };
  
    App.fn.onToggle = function(event) {
      var element = event.target;
      var id = this.getItemId( element );
      var item = {
        id: id,
        completed: element.checked
      };
      this.stores.save( item, function(item) {
        var li = this.getElementByDataId( item.id );
        li.className = item.completed ? 'completed' : '';
        $('.toggle', li).checked = item.completed;
        this.showControls();
      }.bind(this));
    };
  
    App.fn.onDestroy = function(event) {
      var id = this.getItemId( event.target );
      this.destroy( id );
    };
  
    App.fn.onClearCompleted = function(event) {
      var self = this;
      this.stores.findAll(function( items ) {
        items = items
          .filter(function( item ) {
            return item.completed;
          })
          .forEach(function( item ) {
            self.destroy( item.id );
          });
      });
    };
  
    App.fn.onFilter = function(event) {
      document.location.hash = event.target.getAttribute('href');
      this.render();
    };
  
    // Insert
    App.fn.insert = function( text ) {
      var item = {
        text: text,
        completed: false
      };
      this.stores.save(item, function( item ) {
        var element = this.nodeItem( item );
        this.$list.appendChild( element );
        this.showControls();
      }.bind(this));
    };
  
    // Destroy
    App.fn.destroy = function( id ) {
      this.stores.destroy( id, function() {
        var li = this.getElementByDataId( id );
        this.$list.removeChild(li);
        this.showControls();
      }.bind(this));
    };
  
    App.fn.filter = function() {
      var hash = document.location.hash;
      if( !hash ) return false;
      $.qsa( '.button', this.$filters )
        .each(function( button ) {
          if ( button.getAttribute('href') === hash ) {
            button.className = 'button selected';
          } else {
            button.className = button.className.replace('selected', '');
          }
        });
      hash = hash.split('#/')[1]
      return hash !== 'all' ? hash : false;
    };
  
    // Render
    App.fn.render = function() {
  
      var filter = this.filter();
  
      this.stores.findAll(function(items){
        if( filter ) {
          items = items
            .filter(function(item) {
              return item.completed === ( filter === 'completed' );
            });
        }
        var nodes = this.nodeItemMulti( items );
        this.$list.innerHTML = "";
        this.$list.appendChild(nodes);
        this.showControls();
  
      }.bind(this));
  
    };
  
  
    App.fn.showControls = function () {
      this.stores.findAll(function(items){
        this.showBarAndToggleAll( items );
        this.showTotalTasksLeft( items );
        this.showClearCompleted( items );
      }.bind(this));
    };
  
    App.fn.showBarAndToggleAll = function( items ) {
      var total = items.length;
      var completed = items.filter(function(item){
        return item.completed;
      });
      var value = total ? 'block' : 'none';
      this.$toggleAll.style.display = value;
      this.$toggleAll.checked = total === completed.length;
      this.$bar.style.display = value;
    };
  
    App.fn.showTotalTasksLeft = function(items) {
      items = items
        .filter(function( item ) {
          return !item.completed;
        });
      var len = items.length;
      var text = [len,' item',$.pluralization( len ),' left'].join('');
      this.$total.innerHTML = text;
    };
  
    App.fn.showClearCompleted = function(items) {
      var some = items
        .some(function( item ) {
          return item.completed;
        });
      this.$clearCompleted.style.display = some ? 'inline-block' : 'none';
    };
  
    App.fn.nodeItemMulti = function ( items ) {
      var fragment = document.createDocumentFragment();
      $.each( items, function( item ) {
        fragment.appendChild( this.nodeItem(item) );
      }.bind(this));
      return fragment;
    };
  
    App.fn.nodeItem = function( item ) {
      var li = document.createElement('li');
      var div = document.createElement('div');
      var toggle = document.createElement('input');
      var span = document.createElement('span');
      var destroy = document.createElement('button');
      var edit = document.createElement('input');
  
      li.setAttribute('data-id', item.id );
  
      if ( item.completed ) {
        li.className = 'completed';
      }
  
      div.className = 'todo';
  
      toggle.setAttribute('type', 'checkbox');
      toggle.className = 'toggle';
      toggle.checked = item.completed;
  
      span.appendChild( document.createTextNode(item.text) );
  
      destroy.className = 'destroy';
      // destroy.appendChild( document.createTextNode('X') );
  
      edit.setAttribute('type', 'text');
      edit.className = 'edit';
  
  
      div.appendChild(toggle);
      div.appendChild(span);
      div.appendChild(destroy);
  
      li.appendChild(div);
      li.appendChild(edit);
  
      return li;
    }
  
    // Initialization on Dom Ready
    window.addEventListener('DOMContentLoaded', function() {
      var app = new App('todo');
    });
  
  })(this);






  ;(function(context) {

    'use strict';
  
    function $( selector, scope ) {
      return $.qsa( selector, scope, true );
    }
  
    $['qsa'] = function( selector, scope, first ) {
      var e = ( scope || document).querySelectorAll( selector );
      return first ? e[0] : e;
    };
  
    $['noop'] = function() {};
  
  
    $['each'] = function( array, cb ) {
      var len = array.length;
      var idx = -1;
      while( ++idx < len ) {
        cb.call(array, array[idx], idx, array);
      }
    };
  
    $['pluralization'] = function( value ) {
      return +value === 1 ? "" : "s";
    };
  
    $['on'] = function (target, type, callback, useCapture) {
      target.addEventListener(type, callback, !!useCapture);
    };
  
    $['delegate'] = function (target, selector, type, handler) {
      function dispatchEvent(event) {
        var targetElement = event.target;
        var potentialElements = $.qsa(selector, target);
        var hasMatch = Array.prototype.indexOf.call(potentialElements, targetElement) >= 0;
        if (hasMatch) {
          handler.call(targetElement, event);
        }
      }
  
      // https://developer.mozilla.org/en-US/docs/Web/Events/blur
      var useCapture = type === 'blur' || type === 'focus';
  
      $.on(target, type, dispatchEvent, useCapture);
    };
  
    $['parent'] = function (element, tagName) {
      if (!element.parentNode) {
        return;
      }
      if (element.parentNode.tagName.toLowerCase() === tagName.toLowerCase()) {
        return element.parentNode;
      }
      return $.parent(element.parentNode, tagName);
    };
  
    context.$ = $;
  
  })(this);
  
  // Prototype
  NodeList.prototype.each = function( fn ) {
    var len = this.length;
    var idx = -1;
    while( ++idx < len ) {
      fn.call(this, this[idx], idx, this);
    }
  }
  
  Array.prototype.some = function( fn ) {
  
    var len = this.length;
    var idx = -1;
    while( ++idx < len ) {
      if( fn( this[idx], idx, this ) ) {
        return true;
      }
    }
    return false;
  
  };







  ;(function(context) {

    'use strict';
  
    var store = localStorage;
  
    function Stores( key ) {
      this.key = key;
      if( !store[key] ) {
        store[key] = JSON.stringify([]);
      }
    }
  
    Stores.fn = Stores.prototype;
  
    Stores.fn.find = function( id, cb ) {
  
      var items = JSON.parse(store[this.key]);
      var item = items
        .filter(function(item) {
          return id === item.id;
        });
      cb.call(this, item[0] || {} );
    };
  
    Stores.fn.findAll = function( cb ) {
      cb.call(this, JSON.parse( store[this.key] ));
    };
  
    Stores.fn.save = function( item, cb, options ) {
  
      var items = JSON.parse(store[this.key]);
  
      // Implementar Update Multiple
      // if ( options && options.multi ) {
      // }
  
      // Update
      if (item.id) {
        items = items
          .map(function( x ) {
            if( x.id === item.id ) {
              for (var prop in item ) {
                x[prop] = item[prop];
              }
            }
            return x;
          });
      // Insert
      } else {
        item.id = new Date().getTime();
        items.push(item);
      }
  
      store[this.key] = JSON.stringify(items);
  
      cb.call(this, item);
      // this.findAll(cb);
  
    };
  
    Stores.fn.destroy = function( id, cb ) {
  
      var items = JSON.parse(store[this.key]);
      items = items
          .filter(function( x ) {
            return x.id !== id;
          });
  
      store[this.key] = JSON.stringify(items);
  
      cb.call(this, true);
  
    };
  
  
    Stores.fn.drop = function( cb ) {
      store[this.key] = JSON.stringify([]);
      this.findAll(cb);
    };
  
    context.Stores = Stores;
  
  })( this );