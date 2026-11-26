import json, urllib.request, time, sys
BASE="https://recherche-entreprises.api.gouv.fr/search?activite_principale={naf}&departement={dep}&etat_administratif=A&per_page=25&page={p}"
NAF={"43.21A":"installation électrique","43.22A":"plomberie / chauffage","43.32A":"menuiserie","43.91A":"couverture"}
DEPS=["75","69","13"]
PAGES=40
def get(url):
    for k in range(6):
        try:
            return json.load(urllib.request.urlopen(url, timeout=30))
        except Exception:
            time.sleep(1.5*(k+1))
    return None
out=[]; vus=set(); stats={}
for naf in NAF:
  for dep in DEPS:
    rec=0; scan=0
    for p in range(1,PAGES+1):
        d=get(BASE.format(naf=naf,dep=dep,p=p))
        if d is None: print("abandon",naf,dep,p,flush=True); break
        res=d.get('results',[])
        if not res: break
        for r in res:
            scan+=1; s=r['siege']
            if (s.get('date_creation') or '')>='2026-01-01' and r['siren'] not in vus:
                vus.add(r['siren']); rec+=1
                out.append({"nom":r['nom_complet'],"siren":r['siren'],"date_creation":s['date_creation'],
                  "ville":s.get('libelle_commune'),"code_postal":s.get('code_postal'),"naf":s.get('activite_principale'),
                  "activite":NAF[naf],"effectif_tranche":s.get('annee_tranche_effectif_salarie'),
                  "nb_etablissements":r.get('nombre_etablissements')})
    stats[f"{naf}-{dep}"]=(scan,rec)
    print(naf,dep,"scannes",scan,"recents",rec,flush=True)
    json.dump({"entreprises":out,"stats":stats},open("resultats.json","w"),ensure_ascii=False,indent=1)
print("FIN",len(out),flush=True)
