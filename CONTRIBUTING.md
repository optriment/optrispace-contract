# Contributing to OptriSpace Smart Contracts

The development branch is `develop`.\
This is the default branch that all Pull Requests (PR) should be made against.

Requirements:

* [Node.js](https://nodejs.org/en/) version 16 or 17

## Developing locally

Please follow instructions below to install Smart Contracts locally.

1. [Fork](https://help.github.com/articles/fork-a-repo/)
   this repository to your own GitHub account

2. [Clone](https://help.github.com/articles/cloning-a-repository/)
   it to your local device

3. Create a new branch:

    ```sh
    git checkout -b YOUR_BRANCH_NAME
    ```

4. Install the dependencies with:

    ```sh
    make setup
    ```

5. Copy the environment variables:

    ```sh
    cp .env.example .env
    ```

## Running tests

```sh
make test
```

## Linting

To check the formatting of your code:

```sh
make lint
```

If you get errors, you can fix them with:

```sh
make fix
```
