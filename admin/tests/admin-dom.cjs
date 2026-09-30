// DOM mínimo para ejercitar formularios y renderizado sin conexión ni credenciales.
exports.dom = function dom() {
  const nodes = new Map();
  function node(tag='div',id='') {
    return {tagName:tag.toUpperCase(),id,value:'',textContent:'',hidden:false,disabled:false,checked:false,type:'',dataset:{},children:[],handlers:{},
      append(...children){this.children.push(...children);},appendChild(child){this.children.push(child);},
      replaceChildren(...children){this.children=children;},
      addEventListener(event,fn){this.handlers[event]=fn;},
      querySelectorAll(selector){
        const descendants=[]; const visit=element=>{for(const child of element.children||[]){descendants.push(child);visit(child);}};visit(this);
        if(selector==='input:checked')return descendants.filter(x=>x.tagName==='INPUT'&&x.checked);
        if(selector==='input')return descendants.filter(x=>x.tagName==='INPUT');
        if(selector==='button')return descendants.filter(x=>x.tagName==='BUTTON');
        return [];
      },
      querySelector(selector){return this.querySelectorAll(selector)[0];},
      closest(){return get('login-card');},
      focus(){this.focused=true;},reset(){this.querySelectorAll('input').forEach(x=>{x.value='';x.checked=false;});}
    };
  }
  function get(id) {if(!nodes.has(id))nodes.set(id,node('div',id));return nodes.get(id);}
  return {get,node,document:{getElementById:get,createElement:tag=>node(tag),createTextNode:text=>({textContent:text})}};
};
