#!/usr/bin/env node
const fs=require("fs"),
      path=require("path");

function readfile(fname){return String(fs.readFileSync(fname));}
function writefile(fname){fs.writeFileSync(fname);}
function readstdin(cb){
	let acc="";
	process.stdin.on("data",function(data){
		acc+=data;
	}).on("end",function(){
		cb(acc);
	});
}

{
	let template=null;
	function inlineTemplate(code){
		if(template==null){
			template=readfile(path.dirname(process.argv[1])+"/template.tex");
		}
		return template+code+"\n\n\\end{document}\n";
	}
}

function splitone(t,d){
	const idx=t.indexOf(d);
	if(idx==-1)return null;
	else return [t.slice(0,idx),t.slice(idx+1)];
}

function flatten(a){return [].concat.apply([],a);}
function joins(a,d){
	if(a.length==0)return "";
	return a.reduce(function(acc,e){return acc+d+e;});
}

class Tag{
	constructor(name,attrs){
		this.name=name;
		this.attrs=attrs;
		this.children=[];
	}

	addchild(child){
		if(!(child instanceof Tag))throw new Error("Adding non-tag as child to tag");
		this.children.push(child);
	}
}

function parsehtml(html){
	html=html.replace(/<!--.*?-->/g,"");
	const mtags=html.match(/<\/?\w+(?: [^>]+)?\/?>/g);
	if(mtags.length==0)return new Tag("BASE",[]);
	const nodestack=[new Tag("BASE",[])];
	let cursor=html.indexOf(mtags[0]);
	if(cursor==-1)throw new Error("Could not find matched tag i=0");
	for(let i=1;i<=mtags.length;i++){
		let newcursor=i==mtags.length?html.length:html.indexOf(mtags[i],cursor+1);
		if(newcursor==-1)throw new Error("Could not find matched tag i="+i);
		const parsed=mtags[i-1].match(/^<(\/?)(\w+)(?:(\s+\S.*[^/\s]))?\s*(\/?)>$/);
		if(parsed[3]==undefined)parsed[3]="";
		const closing=parsed[1]=="/",
		      tagname=parsed[2],
		      attrs=parsed[3].split(/\s+/g).slice(1).map(a=>a.match(/\s*(\w+)="([^"]*)"$/).slice(1)),
		      autoclose=parsed[4]=="/";
		if(autoclose){
			nodestack[nodestack.length-1].addchild(new Tag(tagname.toLowerCase(),attrs));
		} else if(!closing){
			nodestack.push(new Tag(tagname.toLowerCase(),attrs));
		} else {
			if(tagname!=nodestack[nodestack.length-1].name){
				throw new Error("Mismatched <"+nodestack[nodestack.length-1].name+"> and </"+tagname+">");
			}
			nodestack[nodestack.length-2].addchild(nodestack[nodestack.length-1]);
			nodestack.pop();
		}
		if(newcursor-(cursor+mtags[i-1].length)>0){
			nodestack[nodestack.length-1].addchild(new Tag("TEXT",[["value",html.slice(cursor+mtags[i-1].length,newcursor)]]));
		}
		cursor=newcursor;
	}
	if(nodestack.length!=1)throw new Error("Nodestack length is "+nodestack.length+" != 1");
	return nodestack[0].children;
}

function main(){
	let code;
	if(process.argv.length==2)readstdin(continueCode);
	else if(process.argv.length==3)continueCode(readfile(process.argv[2]));
}

function continueCode(code){
	const nodes=parsehtml(code);
	// console.log(JSON.stringify(nodes));
	console.log(inlineTemplate(fixlatex(joins(nodes.map(latexify),""))))
}

function fixlatex(latex){
	return latex.replace(/\n+\\begin{align\*}/g,"\n\\begin{align*}")
	            .replace(/\\end{align\*}\n+/g,"\\end{align*}\n")
}

function latexify(node){
	switch(node.name){
		case "TEXT":
			return node.attrs[0][1].replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
		case "p":
			return joins(node.children.map(latexify),"")+"\n\n";
		case "em":
			return "\\textit{"+joins(node.children.map(latexify),"")+"}";
		case "strong":
			return "\\textbf{"+joins(node.children.map(latexify),"")+"}";
		case "code":
			return "\\( "+joins(node.children.map(latexify),"")+" \\)";
		case "pre":
			if(node.children.length==1&&node.children[0].name=="code")node=node.children[0];
			return "\\begin{align*}\n"+joins(node.children.map(latexify),"")+"\\end{align*}";
		case "h1":
			return "{\\textbf{\\Huge "+joins(node.children.map(latexify),"")+"}}\\vspace{2pt}\\hrule";
		case "h2":
			return "\\tsection{"+joins(node.children.map(latexify),"")+"}";
		case "ol": {
			const lis=node.children.filter(n=>n.name=="li");
			return "\\begin{enumerate}\n\\item "+joins(lis.map(latexify),"\\item ")+"\\end{enumerate}";
		}
		case "ul": {
			const lis=node.children.filter(n=>n.name=="li");
			return "\\begin{itemize}\n\\item "+joins(lis.map(latexify),"\\item ")+"\\end{itemize}";
		}
		case "li":
			return joins(node.children.map(latexify),"");
		default:
			return "UNKNOWN TAG <"+node.name+">";
	}
}

main();
