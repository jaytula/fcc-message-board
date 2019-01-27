/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';
const mongodb = require('mongodb')
const ObjectId = mongodb.ObjectId

const CONNECTION_STRING = process.env.DB
let db
let dbOk = false

mongodb.connect(CONNECTION_STRING, {useNewUrlParser: true}, async (err, client) => {
  db = client.db(process.env.DBNAME)
  
  try {
    await db.collection('anything').findOne({name: 'whatever'});
    dbOk = true
    console.log('database connection looks good')
  } catch(err) {
    dbOk = false
    console.log(err.message)
  }
})

module.exports = function (app) {
   
  app.route('/api/threads/:board')
  
  .post(async (req, res) => {
    let board = req.params.board
    const {text, delete_password} = req.body
    try {
      if(!text) throw new Error('missing field "text"')
      if(!delete_password) throw new Error('missing field "delete_password"')

      let created_on = new Date()
      let document = {
        board,
        text,      
        created_on,
        bumped_on: created_on,
        reported: false,
        delete_password,
        replies: [],
      }

      let writeResult = await db.collection('threads').insertOne(document)
      //res.redirect(`/b/${board}/`).json(writeResult.ops[0])
      res.json(writeResult.ops[0])
    } catch(err) {
      res.status(400).send(err.message)
    }
      
  })
  
  .get(async (req, res) => {
    let board = req.params.board
    
    try {
      let docs = await db.collection('threads')
      .find({board})
      .project({reported: 0, delete_password: 0, "replies.reported": 0, "replies.delete_password": 0/*, replies: {$slice: 3}*/})
      .sort({ bumped_on: -1}).limit(10).toArray()
      docs.forEach(doc => {
        doc.replycount = doc.replies.length
        doc.hiddencount = doc.replies.reduce((acc, curr) => acc + (curr.reported ? 1 : 0), 0)
        doc.replies = doc.replies.slice(0, 3)
      })
      res.json(docs)
    } catch(err) {
      console.log(err.message)
      res.status(500).send(err.message)
    }
  })
  
  .delete(async (req, res) => {
    let board = req.params.board
    let {thread_id, delete_password} = req.body
    try {
      let result = await db.collection('threads').findOneAndDelete({
        board, 
        _id: ObjectId(thread_id), 
        delete_password
      })
      
      if(!result.value) throw new Error('incorrect password')
      if(result.ok) res.send('success')
    } catch(err) {
      res.status(400).send(err.message)
    }
  })
  
  .put(async (req, res) => {
    let board = req.params.board
    const {thread_id} = req.body
    try {
      let result = await db.collection('threads').findOneAndUpdate(
        {board, _id: ObjectId(thread_id)},
        {$set: { reported: true}},
        {returnOriginal: false}
      )
      if(!result.value) throw new Error('no matching board thread')
      if(!result.value.reported) throw new Error('reported not set to true')
      if(!result.value) throw new Error('invalid thread id')
      res.send('success')
    } catch(err) {
      res.status(400).send(err.message)
    }
  })
     
  app.route('/api/replies/:board')
  
  .post(async (req, res) => {
    let board = req.params.board
    const {thread_id, text, delete_password} = req.body
    
    try {
      if(!thread_id) throw new Error('missing field thread_id')
      if(!text) throw new Error('missing field text')
      if(!delete_password) throw new Error('missing field delete_password')
      
      let reply_id = new ObjectId();
      let writeResult = await db.collection('threads').findOneAndUpdate(
        { _id: ObjectId(thread_id)},
        { 
          $push: {replies: {
            $each: [{
              _id: reply_id,
              text,
              delete_password,
              created_on: new Date(),
              reported: false
            }],
            $sort: {
              created_on: -1
            }
          }
        },
          $set: {bumped_on: new Date()}
        }, 
        { returnOriginal: false }
      )
      let result = writeResult.value
      result.insertedReplyId = reply_id
      res.json(result)
    } catch (err) {
      console.log(err.message)
      res.status(400).send(err.message)
    }
  })
  
  .get(async (req, res) => {
    let board = req.params.board
    let thread_id = req.query.thread_id
    try {
      let docs = await db.collection('threads')
      .find({board, _id: ObjectId(thread_id)})
      .project({
        reported: 0,
        delete_password: 0, 
        "replies.reported": 0, 
        "replies.delete_password": 0
      }).toArray()
      if(docs.length !==1) throw new Error('one document was not returned')
      res.json(docs[0])
    } catch(err) {
      res.status(500).send(err.message)
    }
  })
  
  .delete(async (req, res) => {
    let board = req.params.board
    let {thread_id, reply_id, delete_password} = req.body
    
    try {
      let result = await db.collection('threads').findOneAndUpdate(
        {
          board,
          _id: ObjectId(thread_id),
          replies: {$elemMatch: {_id: ObjectId(reply_id), delete_password}}
        },
        {$pull: {replies: {_id: ObjectId(reply_id)}}}
      ) 
      
      if(!result.value) throw new Error('incorrect password')
      
      if(result.ok) res.send('success')
    } catch(err) {
      res.status(400).send(err.message)
    }
  })

  .put(async (req, res) => {
    let board = req.params.board
    let {thread_id, reply_id} = req.body
    
    try {
      if(!thread_id) throw new Error('missing query param thread_id')
      if(!reply_id) throw new Error('missing query param reply_id')

      let writeResult = await db.collection('threads').findOneAndUpdate(
        {board, _id: ObjectId(thread_id), 'replies._id': ObjectId(reply_id)},
        { $set: { 'replies.$.reported': true }},
        { returnOriginal: false }
        )
      
      res.send('success')
    } catch(err) {
      console.log(err.message)
      res.status(400).send(err.message)
    }
  })
};
 