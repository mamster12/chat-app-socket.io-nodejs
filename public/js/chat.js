const socket = io();

// server (emit) -> client (receive) - acknowledgement --> server
// client (emit) -> server (receive) - acknowledgement --> client

// Elements
const $msgForm = document.querySelector('#message-form');
const $msgFormInput = $msgForm.querySelector('input');
const $msgFormBtn = $msgForm.querySelector('button');
const sendLocationBtn = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');
const $sidebar = document.querySelector('#sidebar');

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;
// options
const { username, room } = Qs.parse(location.search, {
    ignoreQueryPrefix: true,
});

// will just autoscroll when the user is scrolled to the last message (will not if scrolled up)
const autoScroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;

    // Height of the new Message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    // visible height
    const visibleHeight = $messages.offsetHeight;

    // height of messages container
    const containerHeight = $messages.scrollHeight;

    // How far have i scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
};

socket.on('message', (message) => {
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a'),
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoScroll();
});

socket.on('locationMessage', (data) => {
    console.log(data);
    const html = Mustache.render(locationTemplate, {
        username: data.username,
        url: data.url,
        createdAt: moment(data.createdAt).format('h:mm a'),
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoScroll();
});

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users,
    });
    $sidebar.innerHTML = html;
});

// basic messsaging

$msgForm.addEventListener('submit', (e) => {
    e.preventDefault();

    $msgFormBtn.setAttribute('disabled', 'disabled');
    //disable
    const mes = e.target.elements.message.value;
    if (!mes) {
        $msgFormBtn.removeAttribute('disabled');
        return $msgFormInput.focus();
    }
    socket.emit('sendMessage', mes, (error) => {
        $msgFormBtn.removeAttribute('disabled');
        $msgFormInput.value = '';
        $msgFormInput.focus();
        //enable
        if (error) {
            return console.log(error);
        }

        console.log('Message delivered');
    });
});

// geolocation
sendLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('geolocation is not supported by your browser');
    }
    sendLocationBtn.setAttribute('disabled', 'disabled');
    navigator.geolocation.getCurrentPosition((position) => {
        const locationObject = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
        socket.emit('sendLocation', locationObject, (message) => {
            sendLocationBtn.removeAttribute('disabled');
            console.log('location shared', message);
        });
    });
});

// join room
socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});
