function addSubmitHandler(form, options={}) {
  let board = options.board
  let formId = form.id
  
  let type = (/thread/i).test(formId) ? 'threads' : 'replies'
  let method = getMethodFromId(formId)
  let redirect = (method == 'POST')

  //let form = document.getElementById(formId)          
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    let params = new URLSearchParams(new FormData(form))
    board = board || params.get('board')
    params.delete('board')
    console.log({params: params.toString(), board}, )

    try {
      const endpoint = `/api/${type}/${board}`
      let res = await fetch(endpoint, {
        method: method.toUpperCase(),
        body: params
      })
      let text = await res.text()
      if(res.status !== 200) throw new Error(text)
      if(['DELETE', 'PUT'].indexOf(method) !== -1) alert(text)
      if(redirect) {
        window.location.pathname = type=='threads' ? `/b/${board}/` : `/b/${board}/${params.get('thread_id')}`
      }
    } catch(err) {
      alert(err.message)
      console.error(err)
    }
  })
}

function getMethodFromId(id) {
  let resolver = {
    new: 'POST',
    delete: 'DELETE',
    report: 'PUT'
  }
  
  return Object.keys(resolver).reduce((acc, curr) => acc || (id.startsWith(curr) ? resolver[curr] : false),false)
}