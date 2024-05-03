<a name="readme-top"></a>

<br />
<div align="center">
  <a href="https://github.com/OpenAnime/site">
    <img src="https://openani.me/favicon512.png" alt="OpenAnime Logo" width="256" height="256">
  </a>

  <h3 align="center">OpenAnime Watch Together Server</h3>

  <p align="center">
    Watch together socket server that powers watch together feature in OpenAnime
    <br />
    <br />
    <a href="https://openani.me">Website</a>
    ·
    <a href="https://github.com/OpenAnime/watch-together-socket/issues">Report Bug</a>
    ·
    <a href="https://github.com/OpenAnime/watch-together-socket/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-openanime">About OpenAnime</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation-and-local-deployment">Installation and local deployment</a></li>
      </ul>
    </li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
    <li><a href="#contributors">Contributors</a></li>
  </ol>

<!-- ABOUT THE PROJECT -->

## About OpenAnime

[![OpenAnime Homepage][OpenAnime-ss]](https://openani.me)

In March 2022, we founded OpenAnime with the mission of enhancing your anime viewing experience. OpenAnime boasts real-time anime upscaling powered by your GPU, a synchronized 'watch together' feature, personalized playlists, the ability to craft and share your own clips with friends, an immersive offline anime viewing experience directly in your browser, a customizable theme feature, a meticulously crafted video player, and an aesthetically pleasing user interface.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

[![Socket.io][Socket.io]][Socket.io-url]
[![TypeScript][TypeScript]][TypeScript-url]
[![Prettier][Prettier]][Prettier-url]
[![ESLint][ESLint]][ESLint-url]
[![Vite][Vite]][Vite-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps.

### Prerequisites

-   Node.js LTS versions 16, 18 and 20 (22 support not yet implemented)

### Installation and local deployment

1. Clone the repo
    ```sh
    git clone https://github.com/OpenAnime/watch-together-socket.git
    ```
2. Go into the repo directory
    ```sh
    cd watch-together-socket
    ```
3. Install NPM packages
    ```sh
    npm i
    ```
4. Create an .env file using .env.example

5. Run locally
    ```sh
    npm run dev
    ```
    <p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

Contributions are what make this community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->

## License

Distributed under the Business Source License 1.1. See [license file](https://github.com/OpenAnime/licenses/blob/main/BSL.txt) for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

We're grateful to the inspiring projects and individuals who shaped our endeavor. Without them, our project wouldn't be what it is today.

-   [@uNetworkingAB](https://github.com/uNetworkingAB)'s [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ALL CONTRIBUTORS HERE -->

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://spongebed.xyz"><img src="https://avatars.githubusercontent.com/u/56435044?v=4?s=100" width="100px;" alt="SpongeBed"/><br /><sub><b>SpongeBed</b></sub></a><br /><a href="#code-SpongeBed81" title="Code">💻</a> <a href="#content-SpongeBed81" title="Content">🖋</a> <a href="#ideas-SpongeBed81" title="Ideas, Planning, & Feedback">🤔</a> <a href="#projectManagement-SpongeBed81" title="Project Management">📆</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://hanzy.dev"><img src="https://avatars.githubusercontent.com/u/77491112?v=4?s=100" width="100px;" alt="Emirhan"/><br /><sub><b>Emirhan</b></sub></a><br /><a href="#infra-hanzydev" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[TypeScript]: https://img.shields.io/static/v1?style=for-the-badge&message=TypeScript&color=3178C6&logo=TypeScript&logoColor=FFFFFF&label=
[TypeScript-url]: https://www.typescriptlang.org/
[Socket.io]: https://img.shields.io/static/v1?style=for-the-badge&message=Socket.io&color=010101&logo=Socket.io&logoColor=FFFFFF&label=
[Socket.io-url]: https://socket.io
[Vite]: https://img.shields.io/static/v1?style=for-the-badge&message=Vite&color=646CFF&logo=Vite&logoColor=FFFFFF&label=
[Vite-url]: https://vitejs.dev/
[Prettier]: https://img.shields.io/static/v1?style=for-the-badge&message=Prettier&color=222222&logo=Prettier&logoColor=F7B93E&label=
[Prettier-url]: https://prettier.io/
[ESLint]: https://img.shields.io/static/v1?style=for-the-badge&message=ESLint&color=4B32C3&logo=ESLint&logoColor=FFFFFF&label=
[ESLint-url]: https://eslint.org/
[OpenAnime-ss]: /website.png
