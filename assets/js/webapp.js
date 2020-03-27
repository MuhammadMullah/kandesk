import $ from "cash-dom";
import {Socket} from "phoenix";
import LiveSocket from "phoenix_live_view";
import MicroModal from "../vendor/micromodal";
import Popper from "../vendor/popper";
import Sortable from "sortablejs";
import Swal from 'sweetalert2';

let webapp = (function (webapp) {

// --------------------------------------------------------------------------------------
// live_view hooks
// --------------------------------------------------------------------------------------
let phx_hooks = {};

phx_hooks.show_modal = {
    mounted() { MicroModal.show(this.el.id, {
        disableScroll: true,
        onShow: () => { set_draggable(
            this.el.querySelector('.modal-card'),
            this.el.querySelector('.modal-card-head')); },
        onClose: () => { this.pushEvent('close_modal'); }
        })
    }
};

phx_hooks.slide_scroll = {
    mounted() { slide_scroll(this.el, document.getElementById(this.el.getAttribute("data-slider_id"))) }
};

phx_hooks.sortable_columns = {
    mounted() { Sortable.create(this.el, {
        group: this.el.getAttribute("data-sortable_group"),
        handle: '.column_header',
        onEnd: (Evt) => {
            let board_id = parseInt(this.el.closest('[data-board_id]').dataset['board_id']),
                old_pos = Evt.oldIndex + 1,
                new_pos = Evt.newIndex + 1;
            if (old_pos != new_pos) {
                this.pushEvent('move_column', {
                    board_id: board_id,
                    old_pos: old_pos,
                    new_pos: new_pos});
            }
        }})
    }
};

phx_hooks.sortable_tasks = {
    mounted() { Sortable.create(this.el, {
        group: this.el.getAttribute("data-sortable_group"),
        onEnd: (Evt) => {
            let task_id = parseInt(Evt.item.getAttribute('phx-value-id')),
                old_col = parseInt(Evt.from.dataset['column_id']),
                new_col = parseInt(Evt.to.dataset['column_id']),
                old_pos = Evt.oldIndex + 1,
                new_pos = Evt.newIndex + 1;
            if (!(old_pos == new_pos && old_col == new_col)) {
                this.pushEvent('move_task', {
                    task_id: task_id,
                    old_col: old_col,
                    new_col: new_col,
                    old_pos: old_pos,
                    new_pos: new_pos});
            }
        }})
    }
};


// --------------------------------------------------------------------------------------
// draggable modals
// --------------------------------------------------------------------------------------
function set_draggable(draggable, handler) {
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    // get viewport size to stop dragging to far
    let w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    let h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    if (handler) { handler.onmousedown = dragMouseDown; }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup
        x2 = e.clientX;
        y2 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // prevent modal handler from going outside viewport
        if (e.clientX <= w && e.clientX >= 0 && e.clientY <= h && e.clientY >= 0) {
            // calculate the new cursor position
            x1 = x2 - e.clientX;
            y1 = y2 - e.clientY;
            x2 = e.clientX;
            y2 = e.clientY;
            // set the element's new position
            draggable.style.left = (draggable.offsetLeft - x1) + "px";
            draggable.style.top = (draggable.offsetTop - y1) + "px";
            draggable.style.right = "unset";
            draggable.style.bottom = "unset";
            draggable.style.position = "fixed";
        }
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
};


// --------------------------------------------------------------------------------------
// board scrolling
// --------------------------------------------------------------------------------------
function slide_scroll(handler, slider) {
    let isDown = false;
    let startX;
    let scrollLeft;

    handler.addEventListener('mousedown', (e) => {
      if(e.target !== e.currentTarget) return;
      isDown = true;
      slider.classList.add('active');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseup', () => {
      isDown = false;
      slider.classList.remove('active');
    });

    slider.addEventListener('mousemove', (e) => {
      if(!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX);
      slider.scrollLeft = scrollLeft - walk;
    });
};


// --------------------------------------------------------------------------------------
// live_view live_socket
// --------------------------------------------------------------------------------------
let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content");
webapp.live_socket = new LiveSocket("/live", Socket, {
    params: {_csrf_token: csrfToken},
    hooks: phx_hooks});
webapp.live_socket.connect();


// --------------------------------------------------------------------------------------
// overrides default data confirmation to use swal
// --------------------------------------------------------------------------------------
function extractPhxValue(el, meta) {
    let prefix = "phx-value-";
    for (let i = 0; i < el.attributes.length; i++) {
      let name = el.attributes[i].name;
      if(name.startsWith(prefix)){ meta[name.replace(prefix, "")] = el.getAttribute(name) };
    }
    return meta;
};

document.body.addEventListener('phoenix.link.click', function (e) {
    e.stopPropagation();
    let message = e.target.getAttribute("data-confirm");
    if(!message) { return true; };
    e.preventDefault();

    let el = e.target,
        event = el.getAttribute('phx-click'),
        meta = extractPhxValue(el, {});

    Swal.fire({
        title: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.value) {
            webapp.live_socket.root.pushHookEvent(null, event, meta);
        }
    })
}, false);


// --------------------------------------------------------------------------------------
// webapp initialization
// --------------------------------------------------------------------------------------
webapp.init = function() {

}


return webapp;

}(webapp || {}));

window.webapp = webapp;
