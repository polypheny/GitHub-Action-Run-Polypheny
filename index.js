const core = require('@actions/core');
const http = require('@actions/http-client');
const { spawn } = require('node:child_process');

/**
 * @param {http.HttpClient} client
 */
async function waitUntilReady(client) {
    while (true) {
	try {
	    const response = await client.get('http://127.0.0.1:7659/isReady');
	    const body = await response.readBody();
	    if (body !== 'true') {
		throw Error(`Server response: ${body}`)
	    }
	    return Promise.resolve();
	} catch (error) {
	    await new Promise(resolve => setTimeout(() => resolve(), 1000));
	}
    }
}

async function main() {
    let polypheny = undefined;
    try {
	const jar = core.getInput('jar');
	const cmd = core.getInput('cmd');
	const autodocker = core.getInput('autodocker');
	const working_directory = core.getInput('working-directory');

	process.chdir(working_directory);
	let args;
	if (autodocker === 'true') {
	    args =  ['-jar', jar, '-resetCatalog', '-resetDocker'];
	} else if (autodocker === 'false') {
	    args =  ['-jar', jar, '-resetCatalog', '-resetDocker', '-noAutoDocker'];
	} else {
	    throw new Error(`Invalid value for option autodocker: ${autodocker}`);
	}
	polypheny = spawn('java', args);
	polypheny.stdout.on('data', data => {
	});
	polypheny.stderr.on('data', data => {
	});

	await waitUntilReady(new http.HttpClient(requestOptions={allowRetries: true, maxRetries: 10}));

	const cmd_process = spawn(cmd, options={shell: true});
	cmd_process.stdout.on('data', data => {
	    process.stdout.write(data);
	});
	cmd_process.stderr.on('data', data => {
	    process.stderr.write(data);
	});
	const code = await new Promise(resolve => cmd_process.on('exit', code => resolve(code)));

	if (code !== 0) {
	    core.setFailed(`Command exited with code ${code}`);
	}
	polypheny.kill('SIGINT');
    } catch (error) {
	core.setFailed(error.message);
    } finally {
	if (polypheny !== undefined) {
	    polypheny.kill('SIGINT');
	}
    }
}

main();
