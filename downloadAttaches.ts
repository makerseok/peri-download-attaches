// import { test, expect } from '@playwright/test';
import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import Path from 'path';

const BASE_URL = '/hub';
const DONE_URL =
  'https://gb9fb258fe17506-apexdb.adb.ap-seoul-1.oraclecloudapps.com/ords/pr/v1/peri/attaches'; // :api_id

downloadAttaches();

async function downloadAttaches() {
  const { data } = await axios.get(
    'https://gb9fb258fe17506-apexdb.adb.ap-seoul-1.oraclecloudapps.com/ords/pr/v1/peri/attaches',
  );
  console.log('length', data.items.length);
  data.items.map((item: any) => {
    const directory = Path.resolve(BASE_URL, String(item.API_ID), item.ID);
    const resultUrl = `${DONE_URL}/${String(item.API_ID)}`;
    const resultBody = {
      id: item.ID,
      attach_url: item.ATTACH_URL,
    };
    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      downloadAttach(
        directory,
        item.ATTACH_NAME,
        item.ATTACH_URL,
        resultUrl,
        resultBody,
      );
    } catch (error) {
      console.log('Error creating folder', directory);
    }
  });
}

async function downloadAttach(
  directory: string,
  filename: string,
  url: string,
  resultUrl: string,
  resultBody: { id: string; attach_url: string },
) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 10000,
    });
    if (response.status !== 200) {
      throw new Error('Response status is not 200');
    }
    const filePath: fs.PathLike = Path.resolve(
      directory,
      filename.match(/\.([^.]{2,5})$/)
        ? filename
        : extractDownloadFilename(response),
    );
    const writer = fs.createWriteStream(filePath);
    const pipe = response.data.pipe(writer);
    pipe.on('finish', function () {
      writer.end();
      writer.destroy();
      pipe.end();
      axios.post(resultUrl, resultBody);
      console.log(`File "${filePath}" saved complete`);
    });
  } catch (error: any) {
    console.log(
      'Error downloading attachment',
      directory,
      filename,
      error.message,
    );
  }
}

function extractDownloadFilename(response: AxiosResponse) {
  const disposition = response.headers['content-disposition'];

  let filename = disposition.split(/;(.+)/)[1].split(/=(.+)/)[1];
  filename = decodeURIComponent(
    filename.replace("utf-8''", '').replace("UTF-8''", '').replace(/;$/, ''),
  );
  return filename;
}
