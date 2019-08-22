const { series, parallel, watch, src, dest } = require('gulp');

const $   = require('gulp-load-plugins')();
const del = require('del');

const browserSync = require('browser-sync').create();
const transform = require('vinyl-transform');

const site_name = param('site','main');
const src_path  = 'src';
const dist_path = 'dist';

let debug = true;
let proxy = param('proxy','localhost');
let staticSrc = src_path+'/**/*.{webm,svg,eot,ttf,woff,woff2,otf,mp4,json,pdf,ico,css,min.js}';

function param(param_name, default_result){
	const args = process.argv.slice(2)
	let param  = default_result;

	args.forEach((val, index) => {
		if(val.includes(param_name)){
			const p = val.split("=");
			if(p.length>0) {
				param = p[1];
			}
		}
	});
	
	console.log(`Set --${param_name} to: ${param}`);
	
	return param;
}

/*
 * Utils ----------------------------------------------------------------------
 */
function clean() {
	return del([dist_path+'/**/*',]);
}

function copy() {
	return src(staticSrc)
	.pipe(dest(dist_path+'/'))
}

/*
 * Style ----------------------------------------------------------------------
 */
function styles() {
	let out = src(src_path+'/scss/'+site_name+'.scss')
	.pipe( $.cssGlobbing({
		extensions: ['.scss']
	})); 

	
	if (debug) {
		// Create Sourmaps for develop
		return out.pipe($.sourcemaps.init())
			.pipe($.sass({ style: 'compressed', sourcemap: true}))
			.on('error', $.sass.logError)
			.on('error', (err) => {
				$.notify().write(err);
			})
			.pipe( $.autoprefixer({
				cascade: false
			}))
			.pipe($.rename(site_name+'.min.css'))
			.pipe($.sourcemaps.write('./'))
			.pipe(dest('./'+dist_path+'/css'))
			.pipe(browserSync.stream({match: '**/*.css'}));
	} else {
		// Remove sourcemaps and minify for production
		return out.pipe($.sass({ style: 'compressed'}))
			.on('error', $.sass.logError)
			.on('error', (err) => {
				$.notify().write(err);
			})
			.pipe( $.autoprefixer({
				cascade: false
			}))
			.pipe($.rename(site_name+'.min.css'))
			.pipe(dest('./'+dist_path+'/css'));
	}
}

/*
 * Scripts --------------------------------------------------------------------
 */
function scripts() {
	// Development 
	if (debug) {
		return src(src_path+'/js/'+site_name+'.js')
			.pipe($.sourcemaps.init())
			.on('error', (err) => {
				$.notify().write(err);
			})
			.pipe($.babel({
				presets: ['@babel/env']
			}))
			.pipe($.sourcemaps.write('./'))
			.pipe(dest(dist_path+'/js'))
	}
	// Production 
	else {
		return src(src_path+'/js/'+site_name+'.js')
			.on('error', (err) => {
				$.notify().write(err);
			})
			.pipe($.babel({
				presets: ['@babel/env']
			}))
			.pipe(dest(dist_path+'/js'))
	}
}

function scripts_watch(done) {
	browserSync.reload();
	done();
}

/*
 * Images ---------------------------------------------------------------------
 */

function images() {
	return src(['./'+src_path+'/img/**/*.jpg', './'+src_path+'/img/**/*.png', './'+src_path+'/img/**/*.jpeg'])
		.pipe($.image())
		.pipe(dest('./'+dist_path+'/img/'));
}

function production(done) {
	debug = false;
	console.log(`Set debug to: ${debug}`);
	done();
}

exports.build = series(production, clean, images, copy, styles, scripts	);
exports.dev = series(images, styles, scripts, copy, function(done){
	// Serve
	browserSync.init({
		proxy: proxy,
		ghostMode: false
	});
	
	// Watch
	watch(src_path+'/img/**/*', series(images));
	watch(src_path+'/scss/**/*.scss', series(styles));
	watch(src_path+'/js/**/*.js', series(scripts, scripts_watch));
	watch(['./**/*.html'], { events: 'change' }, function(cb) {
	    browserSync.reload
	    cb();
	});
	watch(staticSrc, series(copy));

	watch([
		dist_path+'/**/*.js',
		dist_path+'/**/*.css'
	]);
});