/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

const axios = require('axios')
var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

chai.use(chaiHttp);

function postNewThread(text, delete_password, board='test') {
  return chai.request(server).post('/api/threads/' + board)
    .send({text, delete_password})
}

function postReply(thread_id, text, delete_password, board='test') {
  return chai.request(server).post('/api/replies/' + board)
    .send({thread_id, text, delete_password})
}

suite('Functional Tests', async function() {
  suite('API ROUTING FOR /api/threads/:board', function() {    
        suite('POST', function() {
      test('post with text and delete_password', async () => {
        let res = await postNewThread('can i buy a dog', 'pass123')
        assert.equal(res.status, 200)
        assert.property(res.body, '_id')
        assert.property(res.body, 'board')
        assert.property(res.body, 'text')
        assert.property(res.body, 'created_on')
        assert.property(res.body, 'bumped_on')
        assert.property(res.body, 'reported')
        assert.property(res.body, 'delete_password')
        assert.property(res.body, 'replies')
        
        let thread_id = res.body._id
        
        await postReply(thread_id, 'first reply!', 'pass123a')
        await postReply(thread_id, 'second reply!', 'pass123a')
        await postReply(thread_id, 'third reply!', 'pass123a')
        await postReply(thread_id, 'fourth reply!', 'pass123a')
        await postReply(thread_id, 'fifth reply!', 'pass123a')
      })
      
      test('post new thread with missing fields', async () => {
        let res 
        res = await postNewThread('i love hula hoops', '')
        assert.equal(res.status, 400)
        assert.isTrue(/missing field/.test(res.text))
        
        res = await postNewThread('', 'somepass')
        assert.equal(res.status, 400)
        assert.isTrue(/missing field/.test(res.text))
      })
    });
    
    suite('GET', function() {
      test('Get list of threads on board', async () => {
        let res = await chai.request(server).get('/api/threads/test')
        assert.equal(res.status, 200)
        assert.isArray(res.body)
        assert.isOk(res.body.length)
        assert.property(res.body[0], '_id')
        assert.property(res.body[0], 'board')
        assert.property(res.body[0], 'text')
        assert.property(res.body[0], 'replies')
        assert.notProperty(res.body[0], 'reported')
        assert.notProperty(res.body[0], 'delete_password')
        assert.isArray(res.body[0].replies)
        assert.isAtMost(res.body[0].replies.length, 3)
        assert.isOk(res.body[0].replies)
        assert.property(res.body[0].replies[0], '_id')
        assert.property(res.body[0].replies[0], 'text')
        assert.notProperty(res.body[0].replies[0], 'reported')
        assert.notProperty(res.body[0].replies[0], 'delete_password')
      })
    });
    
    suite('DELETE', function() {
      test('Delete a thread works', async () => {
        let localThread = await postNewThread('to-be-deleted thread #1','pass123')
        let {_id: thread_id, delete_password} = localThread.body

        let deleteResponse = await chai.request(server).delete('/api/threads/test')
        .send({thread_id, delete_password})
        assert.equal(deleteResponse.text, 'success')        
      })
      
      test('Delete a thread with wrong password', async () => {
        let localThread = await postNewThread('to-be-deleted thread #2','pass123')
        let {_id: thread_id, delete_password} = localThread.body

        let deleteResponse = await chai.request(server).delete('/api/threads/test')
        .send({thread_id, delete_password: 'wrongpassword'})
        assert.equal(deleteResponse.text, 'incorrect password')        
      })
    });
    
    suite('PUT', function() {
      test('Set report to true for thread', async () => {
        let {body: {_id: thread_id }} = await postNewThread('Report thread success', 'pass123')
      
        let res = await chai.request(server).put('/api/threads/test').send({thread_id})
        assert.equal(res.status, 200)
        assert.equal(res.text, 'success')
      })
      
      test('Fail to set thread', async () => {
        let res = await chai.request(server).put('/api/threads/test').send({thread_id: 'invalid'})
        assert.equal(res.status, 400)
      })
    });
  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {
    suite('POST', function() {
      test('post a reply to thread', async () => {
        let localThread = await postNewThread('Thread for reply posting', 'pass123')
        let res = await postReply(localThread.body._id, 'I got here first', 'pass123a')

        assert.equal(res.status, 200)
        assert.property(res.body, '_id')
        assert.property(res.body, 'replies')
        assert.property(res.body, 'insertedReplyId')
        assert.isArray(res.body.replies)
        assert.isTrue(res.body.replies.length > 0, 'there should be a reply')
        assert.property(res.body.replies[0], '_id')
        assert.property(res.body.replies[0], 'text')
        assert.property(res.body.replies[0], 'created_on')
        assert.property(res.body.replies[0], 'delete_password')
        assert.property(res.body.replies[0], 'reported')
      })
      
      test('post a reply missing field', async () => {
        let localThread = await postNewThread('Thread for reply posting #2', 'pass123')
        let res = await postReply(localThread.body._id, 'this reply should not make it', '')
                
        assert.equal(res.status, 400)
        assert.isTrue(/missing field/.test(res.text))
      })
    });
    
    /*I can GET an entire thread with all it's replies from /api/replies/{board}?thread_id={thread_id}. Also hiding the same fields.*/
    suite('GET', function() {
      test('show all replies on thread_id', async () => {
        let localThread = await postNewThread('Thread to check GET replies', 'pass123')
        let thread_id = localThread.body._id
        await postReply(thread_id, 'first reply!', 'pass123a')
        await postReply(thread_id, 'second reply!', 'pass123a')
        await postReply(thread_id, 'third reply!', 'pass123a')
        await postReply(thread_id, 'fourth reply!', 'pass123a')

        let res = await chai.request(server).get('/api/replies/test').query({thread_id})
        assert.equal(res.status, 200)
        assert.property(res.body, '_id')
        assert.property(res.body, 'board')
        assert.property(res.body, 'text')
        assert.property(res.body, 'replies')
        assert.notProperty(res.body, 'reported')
        assert.notProperty(res.body, 'delete_password')
        assert.isArray(res.body.replies)
        assert.equal(res.body.replies.length, 4)
        assert.isOk(res.body.replies)
        assert.property(res.body.replies[0], '_id')
        assert.property(res.body.replies[0], 'text')
        assert.notProperty(res.body.replies[0], 'reported')
        assert.notProperty(res.body.replies[0], 'delete_password')
      })
    });
    
    suite('PUT', function() {
      
    });
    
    suite('DELETE', function() {
      test('Delete a reply works', async () => {
        const delete_password = 'pass123a'
        let localThread = await postNewThread('Delete reply test #1', 'pass123')
        let thread_id = localThread.body._id
        let reply = await postReply(thread_id, 'Something horrible said', delete_password)
        let reply_id = reply.body.insertedReplyId

        let deleteResponse = await chai.request(server).delete('/api/replies/test')
        .send({thread_id, reply_id, delete_password})
        assert.equal(deleteResponse.text, 'success')        
      })
      
      test('Delete a reply with wrong password', async () => {
        let localThread = await postNewThread('Delete reply test #2', 'pass123')
        let thread_id = localThread.body._id
        let reply = await postReply(thread_id, 'This horrible thing remains', 'pass123a')
        let reply_id = reply.body.insertedReplyId

        let deleteResponse = await chai.request(server).delete('/api/replies/test')
        .send({thread_id, reply_id, delete_password: 'wrongpassword'})
        assert.equal(deleteResponse.text, 'incorrect password')        
      })
    });
    
    suite('PUT', function() {
      test('Set reported for reply', async () => {
        let {body: {_id: thread_id }} = await postNewThread('Report reply success', 'pass123')
        
        let {body: {insertedReplyId: reply_id1 }} = await postReply(thread_id, 'Some nasty reply #1', 'pass123a')
        let {body: {insertedReplyId: reply_id2 }} = await postReply(thread_id, 'Some nasty reply #2', 'pass123a')
        
        let res = await chai.request(server).put('/api/replies/test').send({thread_id, reply_id: reply_id2})
        assert.equal(res.status, 200)
        assert.equal(res.text, 'success')
      })
      
      test('Fail to set reported for invalid reply', async () => {
        let {body: {_id: thread_id }} = await postNewThread('Report reply fail', 'pass123')

        let res = await chai.request(server).put('/api/replies/test').send({thread_id, reply_id: 'invalid'})
        assert.equal(res.status, 400)
      })
    });
  });

});