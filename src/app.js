

// express app
const express = require('express');
const app = express() 
const port = 8080;

// fauna db
// const faunaKey = process.env.FAUNA_KEY;
// const faunaDomain = process.env.FAUNA_DOMAIN;
const faunaKey = 'fnAEQbuw1xAAQmoFDjaSLcunvL8Ok7rCCbpVXX7T';
const faunaDomain = 'db.us.fauna.com';
const faunadb = require('faunadb');
const q = faunadb.query;
const dbClient = new faunadb.Client({ domain: faunaDomain, secret: faunaKey });

const db = {
    async read() {
        console.log('reading items');
        try {
            const items = (await dbClient.query(q.Map(q.Paginate(q.Documents(q.Collection('items'))), q.Lambda(x => q.Get(x))))).data;
            return items.map(item => ({ ...item.data, id: item.ref.id }));
        } catch (e) {
            return e.description;
        }
    },
    async add(item) {
        console.log('adding new item');
        try {
            const newItem = await dbClient.query(q.Create(q.Collection('items'), { data: item }));
            return ({ ...newItem.data, id: newItem.ref.id });
        } catch (e) {
            return e.description;
        }
    },
    async remove(id) { 
        console.log(`removing ${id}`);
        try {
            return dbClient.query(q.Delete(q.Ref(q.Collection('items'), id)));
        } catch (e) {
            return e.description;
        }
    },
    async edit({ id, ...rest }) {
        console.log(`editting item ${id}`, rest);
        try {
            const newItem = await dbClient.query(q.Replace(q.Ref(q.Collection('items'), id), rest));
            return ({ ...newItem.data, id: newItem.ref.id });
        } catch (e) {
            return e.description
        }

    }
}


// routes
app.get('/', (req, res) => {
    res.send('Hello World!')
});
  
app.listen(port, async () => {
    console.log(`Test app listening at http://localhost:${port}`)
    try {
        const res = await db.edit({
            id: '307101658101317699',
            type: "text",
            content: "Second Note!",
            coordinates: "200,35"
        });
        console.log(res);
    } catch (e) {
        console.log(e); 
    }
});

