// BET-144 : les anciennes installations n’émettent plus de notifications navigateur.
self.addEventListener('push',()=>{});
self.addEventListener('activate',event=>event.waitUntil(self.registration.getNotifications().then(items=>Promise.all(items.map(item=>item.close())))));
