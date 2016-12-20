module.exports = function(grunt){
	
	//Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/* <%= pkg.name %> v<%= pkg.version %> - <%= grunt.template.today("dd/mm/yyyy") %> */\n'
			},
			my_target: {
				files: {
					'dist/client.min.js': ['client/client.js', 'client/tutorial.js', 'client/hex.js']
				}
			}
		},
		htmlmin: {
			//This task should always be run straight after htmlbuild:dist because it minfies the already built HTML and spits it back into itself
			dist: {
				options: {
					removeComments: true,
					collapseWhitespace: true
				},
				files: {
					'dist/index.html': 'dist/index.html'
				}
			}
		},
		htmlbuild: {
			dist: {
				src: 'client/index.html',
				dest: 'dist/',
				options: {
					//Although htmlbuild's annoying way of trying to 'fix' URLs is active, the server routes any files requested on the root to dist/ if a file of that name exists
					scripts: {
						client: 'dist/client.min.js'
					},
					styles: {
						dist: 'dist/style.css'
					}
				}
			}
		},
		cssmin: {
			options: {
				shorthandCompacting: false,
				roundingPrecision: -1
			},
			target: {
				files: {
					'dist/style.css': ['client/style.css']
				}
			}
		},
		watch: {
			html: {
				files: ['client/index.html'],
				tasks: ['htmlbuild:dist', 'htmlmin']
			},
			css: {
				files: ['client/style.css'],
				tasks: ['cssmin']
			},
			js: {
				files: ['client/*.js'],
				tasks: ['uglify']
			}
		},
		jasmine: {
			server: {
				options: {
					specs: 'tests/*.js',
				}
			}
		}
	});
	
	//Load plugins
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-htmlmin');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-html-build');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	
	//Default tasks
	grunt.registerTask('default', ['uglify', 'htmlbuild:dist', 'htmlmin', 'cssmin', 'jasmine']);
	
	//Build only tasks (no testing)
	grunt.registerTask('build', ['uglify', 'htmlbuild:dist', 'htmlmin', 'cssmin']);
	
	//Tests task, for those who don't know what the jasmine task is called
	grunt.registerTask('test', ['jasmine']);
	
};