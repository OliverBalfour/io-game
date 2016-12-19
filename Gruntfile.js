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
					'client.js': ['src/client.js', 'src/tutorial.js', 'src/hex.js']
				}
			}
		},
		htmlmin: {
			dist: {
				options: {
					removeComments: true,
					collapseWhitespace: true
				},
				files: {
					'index.html': 'src/index.html'
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
					'style.css': ['src/style.css']
				}
			}
		},
		watch: {
			html: {
				files: ['src/index.html'],
				tasks: ['htmlmin']
			},
			css: {
				files: ['src/style.css'],
				tasks: ['cssmin']
			},
			js: {
				files: ['src/*.js'],
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
	grunt.loadNpmTasks('grunt-contrib-watch');
	
	//Default tasks
	grunt.registerTask('default', ['uglify', 'htmlmin', 'cssmin']);
	
	//Production tasks
	grunt.registerTask('dist', ['jasmine']);
	
};