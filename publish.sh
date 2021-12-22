error(){
  echo $1
  exit 1
}

cp data.json.swp data.json
npm version minor && npm publish 
