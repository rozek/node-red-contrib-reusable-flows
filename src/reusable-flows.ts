/**** some basic type definitions for safety ****/

  type NR_Node   = any
  type NR_id     = string
  type NR_Config = any
  type NR_Msg    = {
    topic?:string, payload:any, script?:string,
    _reusableFlows:{ Mode?:'return', Stack:NR_id[] }
  }
  type NR_send   = (msg:NR_Msg | NR_Msg[] | NR_Msg[][] | null) => void
  type NR_done   = (err?:any) => void

/**** actual node definition ****/

  export default function (RED:any):void {
  /**** resuable-in ****/

    function ReusableIn (this:any, config:NR_Config):void {
      RED.nodes.createNode(this,config)

      let Node:any = this
      Node.on('input', function (msg:NR_Msg, send?:NR_send, done?:NR_done) {
        send = send || function () { Node.send.apply(Node,arguments) }

        send(msg)
        if (done) { done() }
      })

    /**** handle invcations ****/

      const CallEvent = 'reusable:' + config.id

      function CallEventListener (msg:any):void {
        Node.receive(msg)
      }

      RED.events.on(CallEvent,CallEventListener)

      Node.on('close', () => {
        RED.events.removeListener(CallEvent,CallEventListener)
      })
    }

    RED.nodes.registerType('reusable-in', ReusableIn)

  /**** resuable-out ****/

    function ReusableOut (this:any, config:NR_Config):void {
      RED.nodes.createNode(this,config)

      let Node:any = this
      Node.on('input', function (msg:NR_Msg, send?:NR_send, done?:NR_done) {
        try {
          let Internals = msg._reusableFlows

          let callingNodeId = Internals.Stack.pop()
          if (callingNodeId == null) {
            throw new Error()
          } else {
            Internals.Mode = 'return'
            RED.events.emit('reusable:' + callingNodeId, msg)
            if (done) { done() }
          }
        } catch (Signal) {
          console.error('broken msg',msg)
          Node.error('broken msg')
          Node.status({ fill:'red', shape:'dot', text:'broken msg' })

          if (done) { done() }
        }
      })
    }

    RED.nodes.registerType('reusable-out', ReusableOut)

  /**** reusable - the calling node ****/

    function Reusable (this:any, config:NR_Config):void {
      RED.nodes.createNode(this,config)

      let FlowToCall:NR_Node | undefined                    // will be set later

    /**** handle calls to the associated flow ****/

      const Node:any = this
      Node.on('input', function (msg:NR_Msg, send?:NR_send, done?:NR_done) {
        send = send || function () { Node.send.apply(Node,arguments) }

        if (FlowToCall == null) {
          send(msg)
          if (done) { done() }
          return
        }

        let Internals = msg._reusableFlows
        if (Internals == null) {
          Internals = msg._reusableFlows = { Stack:[] }
        }

        switch (Internals.Mode) {
          case undefined:                                              // 'call'
            Internals.Stack.push(config.id)
            RED.events.emit('reusable:' + FlowToCall.id, msg)
            break
          case 'return':                                             // 'return'
            delete Internals.Mode

            send(msg)
            if (done) { done() }
            break
          default:                                                 // broken msg
            console.error('broken msg',msg)
            Node.error('broken msg')
            Node.status({ fill:'red', shape:'dot', text:'broken msg' })

            send(null)
            if (done) { done() }
        }
      })

    /**** handle returns from the called flow ****/

      const ReturnEvent = 'reusable:' + config.id

      function ReturnEventListener (msg:any):void {
        Node.receive(msg)
      }

      RED.events.on(ReturnEvent,ReturnEventListener)

    /**** update "FlowToCall" after flow (re-)start ****/

      const FlowToCallEvent = 'reusable:' + config.id + '-FlowToCall'

      function FlowToCallEventListener (Callee:NR_Node | undefined):void {
        FlowToCall = Callee

        if (FlowToCall == null) {
          Node.status({ fill:'yellow', shape:'ring', text:'no flow to call' })
        } else {
          Node.status({})
        }
      }

      RED.events.on(FlowToCallEvent,FlowToCallEventListener)

    /**** clean up on clode ****/

      Node.on('close', () => {
        RED.events.removeListener(ReturnEvent,ReturnEventListener)
        RED.events.removeListener(FlowToCallEvent,FlowToCallEventListener)
      })
    }

    RED.nodes.registerType('reusable', Reusable)

  /**** mapCallersToCallees ****/

    function mapCallersToCallees ():void {
console.log('\n\n\nmapCallersToCallees')
      let Workspaces = Object.create(null)
      let Subflows   = Object.create(null)

      let ReusablesIn = Object.create(null)
      let Reusables   = Object.create(null)

    /**** ContainerOfNode ****/

      function ContainerOfNode (Node:NR_Node):NR_Node | undefined {
        if (Node.type === 'tab') {
          return undefined
        } else {
          let Subflow = Subflows[Node.z]
          if (Subflow == null) {
            return Workspaces[Node.z]
          } else {
            return Subflow
          }
        }
      }

    /**** TabOfNode ****/

      function TabOfNode (Node:NR_Node):NR_Node | undefined {
        if (Node.type === 'tab') { return Node }

        let foundTab = Workspaces[Node.z]
        if (foundTab == null) {
          foundTab = Subflows[Node.z]
        }

        return (foundTab == null ? undefined : TabOfNode(foundTab))
      }

    /**** listWorkspaces ****/

      function listWorkspaces ():void {
        console.log('Workspaces:')
        for (let Id in Workspaces) {
          let Workspace = Workspaces[Id]
          console.log('  ' + Id + ': "' + Workspace.label + '"')
        }
      }

    /**** listSubflows ****/

      function listSubflows ():void {
        console.log('Subflows:')
        for (let Id in Subflows) {
          let Subflow = Subflows[Id]
          console.log('  ' + Id + ': "' + Subflow.label + '"')
        }
      }

    /**** listReusables ****/

      function listReusables ():void {
        console.log('Reusables:')
        for (let Id in Reusables) {
          let Reusable = Reusables[Id]
          console.log(
            '  ' + Id + ': "' + Reusable.name + '" -> "' + Reusable.target + '"'
          )
        }
      }

    /**** listReusablesIn ****/

      function listReusablesIn ():void {
        console.log('ReusablesIn:')
        for (let Id in ReusablesIn) {
          let ReusableIn = ReusablesIn[Id]
          console.log(
            '  ' + Id + ': "' + ReusableIn.name + '"'
          )
        }
      }



    /**** collect workspaces, subflows, reusable_ins and reusables ****/

      RED.nodes.eachNode((Node:any) => {
        switch (Node.type) {
          case 'tab':     Workspaces[Node.id] = Node; break
          case 'subflow': Subflows[Node.id]   = Node; break

          case 'reusable-in':
            ReusablesIn[Node.id] = Node
            break
          case 'reusable':
            Reusables[Node.id] = Node
            break
        }
      })
listWorkspaces()
listReusablesIn()
listReusables()

    /**** construct mappings and inform reusables ****/

      function inform (CallerId:string, Callee:NR_Node):void {
console.log('mapping ',CallerId,'->',Callee == null ? '-' : '"' + Callee.name + '"')
        RED.events.emit('reusable:' + CallerId + '-FlowToCall', Callee)
      }

outerLoop: for (let CallerId in Reusables) {
        let Caller = Reusables[CallerId]

        let [CalleeTabName,CalleeName] = (Caller.target || '').toLowerCase().split(':')
        if (CalleeName == null) {
          CalleeName = CalleeTabName.trim(); CalleeTabName = ''
        } else {
          CalleeTabName = CalleeTabName.trim()
          CalleeName    = CalleeName.trim()
        }

        for (let CalleeId in ReusablesIn) {
          let Callee = ReusablesIn[CalleeId]
          if ((Callee.name || '').toLowerCase() !== CalleeName) { continue }

          if (CalleeTabName === '') {
            if (Caller.z === Callee.z) {
              inform(CallerId,Callee); continue outerLoop
            }
          } else {
            let CalleeTab = TabOfNode(Callee) || {}
            if (CalleeTabName !== (CalleeTab.label || '').toLowerCase()) { continue }

            if (
              (Caller.z === Callee.z) ||
              (Caller.z !== Callee.z) && (Callee.scope === 'global') &&
                ((ContainerOfNode(Callee) || {}).type !== 'subflow')
            ) { inform(CallerId,Callee); continue outerLoop }
          }
        }

        inform(CallerId,undefined) // no callee found
      }
console.log('\n')
    }

    RED.events.on('flows:started', mapCallersToCallees)


  }
