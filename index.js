const aws = require('aws-sdk')
if(!process.env.PROFILE) console.error(`NOTE: You can set REGION or PROFILE environment variables.`)

const region = process.env.REGION || 'ap-southeast-2'
const credentials = new aws.SharedIniFileCredentials({profile:process.env.PROFILE, region})
const cw = new aws.CloudWatch({region, credentials})

// Firstly, get to work listing BucketSizeBytes metrics for all buckets
const metrics = new Promise((a,r)=>cw.listMetrics({
	MetricName: 'BucketSizeBytes',
	Namespace: 'AWS/S3',
}, (err,data)=>{
	if(err){
		console.error(err);
		return r(err)
	}
	a(data)
}))

const subtractHrs = (d,n) => {d.setHours(d.getHours() - n); return d}
const StartTime = subtractHrs(new Date(), 56).toISOString()
const EndTime = subtractHrs(new Date(), 1).toISOString()

async function main(){
	const result = await metrics
	if(!result || !result.Metrics) return console.error('Malformed response, try logging in the first callback')
	if(!result.Metrics.length) return console.error('No buckets found, try another region? eg. prefix REGION=ap-southeast-2')
	const MetricDataQueries = result.Metrics.map(m=>dimensionObj(m.Dimensions)).map(GetDataQuery)
	cw.getMetricData({ EndTime, StartTime, MetricDataQueries }, (err, data) => {
		if(err)return console.error(err);
		const result = data.MetricDataResults.map((r,i)=>{
			return {i,id:r.Id,size:last(r.Values)}
		})
		result.map(v => {
			console.log(`${padn(v.id, 64)}  : ${human(v.size, 10)}`)
		})
	})
}

function human(b){
	if(typeof b !== 'number')return `${b} (?)`
	const style = 1000 // Use 1024 for Gibi vs Giga
	const pad = n => padn(n.toFixed(2), 8)
	const suffixes = 'KB,MB,GB,TB,EB,ZB,YB'.split(',')
	for(let s of suffixes){
		b=b/style
		if(b<1024) return `${pad(b)} ${s}`
	}
	return `${pad(b)} ${last(suffixes)}`
}
function GetDataQuery(bucket,i){
	const name = bucket.BucketName
	const number = i // Index in the array, since this is a mapper function
	const type = bucket.StorageType||'StandardStorage'||'ReducedStorage'
	return {
		Id: `s3_${number}_${slug(name)}_${type}`,
		MetricStat: {
			Metric: {
				Namespace: 'AWS/S3',
				MetricName: 'BucketSizeBytes',
				Dimensions: [
					{Name:'BucketName',Value:name},
					{Name:'StorageType',Value:type},
				],
			},
			Stat: 'Maximum',
			Unit: 'Bytes',
			Period: 3600,
		},
	}
}

const last = a => a[a.length-1]
const padn = (s, n, c=' ') => (s+(new Array(n).fill(c).join(''))).slice(0,n)
// Converts the AWS [{Name:x, Value:y}] into {x:y}
const dimensionObj = (dims) => dims.reduce((t,v)=>({...t, [v.Name]: v.Value}),{})
const slug = (s) => `${s}`.replace(/[^a-zA-Z0-9_]+/gm, '_').slice(0,32)

main()
