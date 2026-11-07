/* Metadatos dinámicos: título, descripción, Open Graph, Twitter y JSON-LD por ficha */
HIS.seo={set:function(o){var c=HIS.cfg,u=c.baseUrl+(o.path||""),t=o.title?o.title+" · "+c.name:c.name+" · "+c.slogan,d=o.desc||c.slogan;
document.title=t;
var m={"meta[name=description]":d,"meta[property=\"og:title\"]":t,"meta[property=\"og:description\"]":d,"meta[property=\"og:url\"]":u,"meta[name=\"twitter:title\"]":t,"meta[name=\"twitter:description\"]":d};
for(var k in m){var e=HIS.u.$(k);if(e)e.setAttribute("content",m[k])}
HIS.u.$("link[rel=canonical]").setAttribute("href",u);
var old=HIS.u.$("#ld-page");if(old)old.remove();
if(o.ld){var s=document.createElement("script");s.type="application/ld+json";s.id="ld-page";s.textContent=JSON.stringify(o.ld);document.head.appendChild(s)}}};
